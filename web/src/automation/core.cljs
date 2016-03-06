(ns automation.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [reagent.core :as reagent :refer [atom cursor]]
            [cljs-http.client :as http]
            [cljs.core.async :refer [put! chan <! >! timeout close!]]))

(defn log [message]
  (.log js/console message))

(defn error [message]
  (.error js/console message))

(defonce app-state (atom {:password "Password"
                          :temperature 20
                          :mode "HEAT"
                          :fan-speed "AUTO"
                          :power-status "OFF"}))

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

(defn atom-text-input [value-atom & [type]]
  [:input {:type (or type "text")
           :value @value-atom
           :on-change #(reset! value-atom (-> % .-target .-value))}])

(defn hello-world []
  (let [password-cursor (cursor app-state [:password])]
    (fn []
      [:div
       [:h1 @password-cursor]
       [atom-text-input password-cursor "password"]])))

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
  [:div {:id "aircon"}
   [:div {:id "temp-control"}
    [:p.temperature (:temperature @app-state)]
    [:div
     [:div.arrowUp {:on-click #(do
                                 (swap! app-state update-in [:temperature] inc)
                                 (send-aircon-state))}]
     [:div.arrowDown {:on-click #(do
                                   (swap! app-state update-in [:temperature] dec)
                                   (send-aircon-state))}]]]
   [:div {:id "mode"}
     [mode-circle "#FF7D83" "HEAT"]
     [mode-circle "#78D3FF" "COOL"]
     [mode-circle "#F1F1BD" "DEHUMIDIFY"]]
   [:div {:id "fan-speed"}
    [:img {:id "power-icon"
           :data-powered (:power-status @app-state)
           :src "images/power.svg"
           :on-click #(toggle-aircon-power)
           :width 75
           :height 75}]
    [:img {:src "images/fan.svg"
           :on-click #(send-sqs-message {:device "air_conditioner"
                                         :password (:password @app-state)})
           :width 75
           :height 75}]]])

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
