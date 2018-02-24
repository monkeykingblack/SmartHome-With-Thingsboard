#include <DHT.h>
#include <SoftwareSerial.h>
#include <stdlib.h>

#define DHTTYPE DHT22
#define DHTPIN 4

DHT dht(DHTPIN,DHTTYPE);
SoftwareSerial ser(2,3);

String inputString = ""; 
boolean stringComplete = false; 

char dataString[50]={0};
byte payload[] = {0x00, 0xFF, 0, 0, 0, 0, 0, 0, 0x01};
//byte payload[] = {0,0,0,0};
int a =0; 

void setup() {
  Serial.begin(9600);              //Starting serial communication
  dht.begin();
  ser.begin(9600);
  inputString.reserve(200);
}
  
void loop() {
  char *ptr;
  byte ret = 1;
  byte sum = 1;
  char s[6];
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  sendPayload(0xAA, t);
  delay(2000);
  sendPayload(0xAB, h);
  delay(2000);
  while (ser.available()) {
    if(ser.available()>0){
      char inChar = (char)ser.read();
      inputString += inChar;
      if (inChar == '\n') {
       stringComplete = true;
      }
    }
  }
  if(stringComplete){
    Serial.print(inputString);
    if(inputString.substring(0,2) == "00" && inputString.substring(10,12) =="01"){
      String sum = StrToHex(inputString.substring(2,8));
      if(sum == inputString.substring(8,10)){
        ctrlEngine(inputString.substring(4,6),inputString.substring(6,8));
    }
  }
    inputString = "";
    stringComplete = false;
  }
}

void serialFloatPrint(float f) {
  byte * b = (byte *) &f;
//  Serial.println(f);
  for(int i=0; i<4; i++) {
    
    byte b1 = (b[i] >> 4) & 0x0f;
    byte b2 = (b[i] & 0x0f);
    
//    sprintf(dataString, "%02X", b[i]);
//    Serial.print(dataString);
    payload[i+3]=b[i];
  }
//  Serial.println("");
}

void sendPayload(byte device, float data){
  Serial.println(data);
  payload[2] = device;
//  float data = dht.readTemperature();  // a value increase every loo
//  Serial.println(data);
  serialFloatPrint(data);
  int sum =1;
  for( int i=0; i<sizeof(payload)-2; i++){
    sum += payload[i];
//    Serial.println(payload[i]);
//    Serial.println(sum);
  }
  payload[7] = sum>>4;
  for( int i=0; i<sizeof(payload); i++){
//    sprintf(dataString, "%02X", payload[i]);
    if(payload[i]<16){
//      Serial.print("0");
      ser.print("0");
    }
    Serial.print(payload[i],HEX);
    ser.print(payload[i],HEX);
  }
  Serial.println("");
}

void ctrlEngine(String device, String state){
  Serial.println("Turn " + deviceSelect(device)+ " " +stateSelect(state));
}

String StrToHex(String s){
  char CardNumber[7];
  byte CardNumberByte[4];
  s.toCharArray(CardNumber, 7);
  int sum =1;
  unsigned long number = strtoul( CardNumber, nullptr, 16);

  for(int i=3; i>=0; i--)    // start with lowest byte of number
  {
    CardNumberByte[i] = number & 0xFF;  // or: = byte( number);
    number >>= 8;            // get next byte into position
  }

  for(int i=0; i<4; i++)
  {
    Serial.print("0x");
    Serial.println(CardNumberByte[i], HEX);
    sum += CardNumberByte[i];
  }
  sum >>=4;
  byte b1 = (sum >> 4) & 0x0f;
  byte b2 = (sum & 0x0f);

  char c1 = (b1 < 10) ? ('0' + b1) : 'A' + b1 - 10;
  char c2 = (b2 < 10) ? ('0' + b2) : 'A' + b2 - 10;
  String t = (String)c1 + (String)c2;
  Serial.println(t);
  return (t);
}

String deviceSelect(String s){
  if(s=="AA"){
    return "Temperature";
  } else if( s=="AB"){
    return "Humidity";
  } else {
    return "";
  }
}

String stateSelect(String s){
  if(s=="00"){
    return "Off";
  }else if(s=="11"){
    return "On";
  }else{
    return "";
  }
}

