#include <WiFi.h>
#include <PubSubClient.h>

// 통신 속도 설정
#define BAUD 9600

// MQTT 브로커 설정
#define MQTT_SERVER "10.0.26.139"
#define MQTT_PORT 1883

// WiFi 설정
#define SSID "microelectronics"
#define SSID_PASSWORD "microelectronics2018"

// 주차장 및 주차 공간 식별자 설정
#define PARKING_LOT_ID "1"

// MQTT 토픽 및 상태 상수 정의
#define PARKING_SPOT_STATE "parking_spot_state"
#define PARKING_LOT "parking_lot"
#define OCCUPIED "OCCUPIED"
#define FREE "FREE"
#define ENTRY "ENTRY"
#define DEPARTURE "DEPARTURE"
#define A1 "A1"
#define A2 "A2"

// 핀 번호 설정
#define ENTRY_PIN 18
#define EXIT_PIN 17
#define A1_PIN 27
#define A2_PIN 26

// 진입 센서의 이전 상태 저장
bool entryPreviousState = false;

// 마지막 상태 업데이트 시간 저장
unsigned long last = 0;

// MQTT 메시지 및 상태 변수 설정
String message;
bool state = false;

WiFiClient espClient;
PubSubClient client(espClient);

// 센서 구조체 정의
struct Sensor {
  const int pin;
  bool state;
};

// 진입, 출구, A1, A2 센서 설정
Sensor entrySensor = { ENTRY_PIN, false };
Sensor exitSensor = { EXIT_PIN, false };
Sensor a1Sensor = { A1_PIN, false };
Sensor a2Sensor = { A2_PIN, false };

// 초기 설정 함수
void setup() {
  Serial.begin(BAUD);

  // 핀 모드 설정
  pinMode(ENTRY_PIN, INPUT_PULLUP);
  pinMode(EXIT_PIN, INPUT_PULLUP);
  pinMode(A1_PIN, INPUT_PULLUP);
  pinMode(A2_PIN, INPUT_PULLUP);

  // WiFi 연결
  WiFi.begin(SSID, SSID_PASSWORD);
  Serial.print("Wi-Fi에 연결 중");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.print("\nWi-Fi 연결됨 - IP 주소: ");
  Serial.println(WiFi.localIP());
  delay(500);

  // MQTT 설정
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqtt_callback);
}

// 진입 이벤트 함수
void entry() {
  Serial.print("진입\n");
}

// MQTT 콜백 함수
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("메시지 도착 [");
  Serial.print(String(topic));
  Serial.print("/");
  Serial.print(String(message));
  Serial.println("] ");

  message = "";
}

// MQTT 재연결 함수
void reconnect() {
  // 연결이 이루어질 때까지 반복
  while (!client.connected()) {
    Serial.println("MQTT 연결 시도 중...");
    if (client.connect("ESP32Client")) {
      Serial.println("연결됨");
    } else {
      Serial.print(client.state());
      Serial.println("실패 - 5초 후 재시도");
      delay(5000);
    }
  }
}

// 루프 함수
void loop() {
  if (!client.connected()) {
    reconnect();
  }

  // MQTT 메시지 수신 및 연결 유지
  client.loop();

  // 일정 주기로 센서 상태 업데이트
  if (millis() > last + 200) {
    last = millis();

    // 진입 센서 이벤트 감지
    if (digitalRead(entrySensor.pin) == 0 && !entrySensor.state) {
      entrySensor.state = true;
      publish_parking_lot_event(ENTRY);
    }
    if (digitalRead(entrySensor.pin) == 1) {
      entrySensor.state = false;
    }

    // 출구 센서 이벤트 감지
    if (digitalRead(exitSensor.pin) == 0 && !exitSensor.state) {
      exitSensor.state = true;
      publish_parking_lot_event(DEPARTURE);
    }
    if (digitalRead(exitSensor.pin) == 1) {
      exitSensor.state = false;
    }

    // A1 주차 공간 상태 업데이트
    if (digitalRead(a1Sensor.pin) == 0 && !a1Sensor.state) {
      a1Sensor.state = true;
      publish_parking_spot_state(A1, OCCUPIED);
    }
    if (digitalRead(a1Sensor.pin) == 1 && a1Sensor.state) {
      a1Sensor.state = false;
      publish_parking_spot_state(A1, FREE);
    }

    // A2 주차 공간 상태 업데이트
    if (digitalRead(a2Sensor.pin) == 0 && !a2Sensor.state) {
      a2Sensor.state = true;
      publish_parking_spot_state(A2, OCCUPIED);
    }
    if (digitalRead(a2Sensor.pin) == 1 && a2Sensor.state) {
      publish_parking_spot_state(A2, FREE);
      a2Sensor.state = false;
    }
  }
}

// 주차장 이벤트 MQTT 전송 함수
void publish_parking_lot_event(char* event) {
  char message[40];
  sprintf(message, "%s|%s", PARKING_LOT_ID, event);
  client.publish(PARKING_LOT, message);
}

// 주차 공간 상태 MQTT 전송 함수
void publish_parking_spot_state(char* parking_spot_name, char* state) {
  char message[40];
  sprintf(message, "%s|%s|%s", PARKING_LOT_ID, parking_spot_name, state);
  client.publish(PARKING_SPOT_STATE, message);
}
