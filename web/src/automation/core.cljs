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
                          :mode 0
                          :fan-speed 0
                          :power-status false
                          :mqtt-connected false}))

(defonce client (-> js/mqtt
                  (.connect "wss://test.mosquitto.org:8081")))

(println client)

(-> client
  (.on "connect" (fn []
    (println "MQTT connected")
    (swap! app-state assoc :mqtt-connected true))))

(-> client
  (.on "close" (fn []
    (println "MQTT disconnected")
    (swap! app-state assoc :mqtt-connected false))))

(-> client
  (.on "message" (fn [topic msg packet]
    (println "received " (.toString msg) " from " topic))))

;; Load the password from local storage
(swap! app-state assoc :password (get-item "password"))

(defn clj->json [msg]
  (.stringify js/JSON (clj->js msg)))

(defn post-path [path data]
  (http/post path {:with-credentials? false
                   :form-params data}))

(defn send-sqs-message [msg]
  (go (let [response (<! (post-path "https://sqs.ap-northeast-1.amazonaws.com/183315676158/ir_commands_ikumi"
                                   {:Action "SendMessage"
                                    :MessageBody (clj->json msg)}))]
        (let [body (:body response)]
          (log body)))))

(defn send-mqtt-message [msg]
  (-> client
    (.publish "43A68DCB-5317-4DF3-BE5E-0446650ACF8A" (clj->json msg))))

(defn send-aircon-state []
  (send-mqtt-message {:mode (:mode @app-state)
                      :temp (:temperature @app-state)
                      :fan_speed (:fan-speed @app-state)
                      :fan_vertical_swing 0
                      :fan_horizontal_swing 0
                      :power_status (:power-status @app-state)
                      :vertical_swing_toggle false
                      :horizontal_swing_toggle false
                      :half_degree_temp false}))

(defn toggle-aircon-power []
  (do
    (if (:power-status @app-state)
      (swap! app-state assoc :power-status false)
      (swap! app-state assoc :power-status true))
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
          :on-click #(do
                       (send-sqs-message {:device "ceiling_light"
                                          :password (:password @app-state)
                                          :data {}})
                       (.preventDefault %))
          :src "images/light.png"}]])

(defn mode-circle [color value]
  [:svg {:width 88
         :height 75
         :style {:cursor "pointer"}} ;; Necessary for mobile safari to register touch events
   [:circle {:on-click #(do
                          (swap! app-state assoc :mode value)
                          (.preventDefault %))
             :cx "50%"
             :cy "50%"
             :r 35
             :fill "white"
             :stroke-width 2
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
                             (send-aircon-state)
                             (.preventDefault %))}]
         [:img.arrowDown {:src "images/chevron-down.svg"
                :width 95
                :on-click #(do
                             (swap! app-state update-in [:temperature] dec)
                             (send-aircon-state)
                             (.preventDefault %))}]]]
       [:div {:id "mode"}
         [mode-circle "#FF7D83" 0]
         [mode-circle "#78D3FF" 1]
         [mode-circle "#F1F1BD" 2]]
       [:div {:id "fan-speed"}
        (if (:password-active @app-state)
          [:div {:id "password-input"}
           [password-input password-cursor]
           [:img {:id "unlock"
                  :src "images/lock-open.svg"
                  :on-click #(do
                               (swap! app-state assoc :password-active false)
                               (.preventDefault %))
                  :width 30
                  :height 30}]]
          [:div {:id "fan-speed"}
           [:img {:id "power-icon"
                  :data-powered (:power-status @app-state)
                  :src "images/power.svg"
                  :on-click #(do
                               (toggle-aircon-power)
                               (.preventDefault %))
                  :width 75
                  :height 75}]
           [:img {:src "images/fan.svg"
                  :on-click #(do
                               (send-aircon-state)
                               (.preventDefault %))
                  :width 75
                  :height 75}]
           [:img {:id "lock"
                  :src "images/lock.svg"
                  :on-click #(do
                               (swap! app-state assoc :password-active true)
                               (.preventDefault %))
                  :width 30
                  :height 30}]])]
        [:div
         [:p (if (:mqtt-connected @app-state)
          "MQTT Connected"
          "MQTT Disconnected")]]])))

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
