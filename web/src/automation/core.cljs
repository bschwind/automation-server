(ns automation.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [reagent.core :as reagent :refer [atom cursor]]
            [cljs-http.client :as http]
            [cljs.core.async :refer [put! chan <! >! timeout close!]]))

(defn log [message]
  (.log js/console message))

(defn error [message]
  (.error js/console message))

(defn set-item [key value]
  (.setItem js/localStorage key value))

(defn get-item [key]
  (.getItem js/localStorage key))

(defonce app-state (atom {:password "placeholder"
                          :password-active false
                          :temperature 20
                          :mode "HEAT"
                          :fan-speed "AUTO"
                          :power-status "OFF"}))

;; Load the password from local storage
(swap! app-state assoc :password (get-item "password"))

(defn clj->json [msg]
  (.stringify js/JSON (clj->js msg)))

(defn post-path [path data]
  (http/post path {:with-credentials? false
                   :form-params data}))

(defn send-sqs-message [msg]
  (go (let [response (<! (post-path "https://sqs.ap-northeast-1.amazonaws.com/183315676158/ir_commands"
                                   {:Action "SendMessage"
                                    :MessageBody (clj->json msg)}))]
        (let [body (:body response)]
          (log body)))))

(defn send-aircon-state []
  (send-sqs-message {:device "air_conditioner"
                     :password (:password @app-state)
                     :data {:mode (:mode @app-state)
                            :temperature (:temperature @app-state)
                            :fan_speed (:fan-speed @app-state)
                            :power_status (:power-status @app-state)}}))

(defn toggle-aircon-power []
  (do
    (if (= (:power-status @app-state) "OFF")
      (swap! app-state assoc :power-status "ON")
      (swap! app-state assoc :power-status "OFF"))
    (send-aircon-state)))

(defn password-input [value-atom]
  [:input {:type "password"
           :value @value-atom
           :on-change #(do
                         (reset! value-atom (-> % .-target .-value))
                         (set-item "password" @value-atom))}])

(defn ceiling-light-control []
  [:div {:id "clicker"}
   [:img {:id "bulb"
          :on-click #(send-sqs-message {:device "ceiling_light"
                                        :password (:password @app-state)
                                        :data {}})
          :src "images/light.png"}]])

(defn mode-circle [color value]
  [:svg {:width 88
         :height 75}
   [:circle {:on-click #(swap! app-state assoc :mode value)
             :cx "50%"
             :cy "50%"
             :r 35
             :fill "white"
             :stroke-width 4
             :stroke color}]
   (if (= value (:mode @app-state))
     [:circle {:cx "50%"
               :cy "50%"
               :r 22
               :fill color}])])

(defn aircon-control []
  (let [password-cursor (cursor app-state [:password])]
    (fn []
      [:div {:id "aircon"}
       [:div {:id "temp-control"}
        [:p.temperature (:temperature @app-state)]
        [:div {:id "up-down"}
         [:img.arrowUp {:src "images/chevron-up.svg"
                :width 95
                :on-click #(do
                             (swap! app-state update-in [:temperature] inc)
                             (send-aircon-state))}]
         [:img.arrowDown {:src "images/chevron-down.svg"
                :width 95
                :on-click #(do
                             (swap! app-state update-in [:temperature] dec)
                             (send-aircon-state))}]]]
       [:div {:id "mode"}
         [mode-circle "#FF7D83" "HEAT"]
         [mode-circle "#78D3FF" "COOL"]
         [mode-circle "#F1F1BD" "DEHUMIDIFY"]]
       [:div {:id "fan-speed"}
        (if (:password-active @app-state)
          [:div {:id "password-input"}
           [password-input password-cursor]
           [:img {:id "unlock"
                  :src "images/lock-open.svg"
                  :on-click #(swap! app-state assoc :password-active false)
                  :width 30
                  :height 30}]]
          [:div {:id "fan-speed"}
           [:img {:id "power-icon"
                  :data-powered (:power-status @app-state)
                  :src "images/power.svg"
                  :on-click #(toggle-aircon-power)
                  :width 75
                  :height 75}]
           [:img {:src "images/fan.svg"
                  :on-click #(send-aircon-state)
                  :width 75
                  :height 75}]
           [:img {:id "lock"
                  :src "images/lock.svg"
                  :on-click #(swap! app-state assoc :password-active true)
                  :width 30
                  :height 30}]])]])))

(defn page []
  [:div
   [ceiling-light-control]
   [aircon-control]])

(reagent/render-component [page]
                          (. js/document (getElementById "app")))

(defn on-js-reload []
  ;; optionally touch your app-state to force rerendering depending on
  ;; your application
  ;; (swap! app-state update-in [:__figwheel_counter] inc)
)
