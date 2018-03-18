import time, string, serial, sys, json, os
import paho.mqtt.client as mqtt

from struct import unpack
from binascii import unhexlify
from ctypes import *

THINGSBOARD_HOST = 'localhost'
ACCESS_TOKEN = 'DHT11_DEMO_TOKEN'

INTERVAL = 2
count = 5

threshold = {'Temperature':70, 'Humidity':70}
status = {'Temperature': False, 'Humidity': False}
sensor_data = {'Temperature':0, 'Humidity':0}

next_reading = time.time()
payload = [0x00, 0xFF, 0, 0,  0, 0x01]

def y(x):
    return{
        'Temperature': 0xAA,
        'Humidity': 0xAB,
        'Gas': 0xAC,
        'Soil moisture': 0xAD,
    }[x]

def sendPayload(label, state):
    payload[2] = y(label)
    payload[3] = state
    s = ""
    for x in range (0,len(payload)-2):
        s += format(payload[x], '02X')
    s += CRC(s) + '01'
    print 'String: ' + s
    ser.write(s + '\n')

def on_connect(client, userdata, rc, *extra_params):
    print('Connected with result code ' + str(rc))
    client.subscribe('v1/devices/me/rpc/request/+')
    client.publish('v1/devices/me/attributes', json.dumps(threshold), 1)

def on_message(client, userdata, msg):
    print 'Topic: ' + msg.topic + '\nMessage: ' + str(msg.payload)
    data = json.loads(msg.payload)
    if data['method'] == 'getThreshold':
        client.publish(msg.topic.replace('request', 'response'), json.dumps(threshold), 1)
    elif data['method'] == 'getStatus':
        client.publish(msg.topic.replace('request', 'response'), json.dumps(status), 1)
    elif data['method'] == 'setThreshold':
        setValue(data['params']['label'],data['params']['threshold'])
        client.publish(msg.topic.replace('request', 'response'), json.dumps(threshold), 1)
        client.publish('v1/devices/me/attributes', json.dumps(threshold), 1)
        
    elif data['method'] == 'setState':
        status[data['params']['label']] = data['params']['enabled']
        state = 0x11 if data['params']['enabled'] == True else 0x00
        sendPayload(data['params']['label'], state)
        client.publish(msg.topic.replace('request', 'response'), json.dumps(status), 1)
        client.publish('v1/devices/me/attributes', json.dumps(status), 1)

def setValue(label, value):
    threshold[label] = value

def f(x):
    return{
        'AA': 'Temperature',
        'AB': 'Humidity',
        'AC': 'Gas',
        'AD': 'Soil moisture'
    }[x]

def upload_data(s):
    data=decode_float(s[6:14])
    sensor_data[f(s[4:6])] = round(data,2)
    global count
    if(count == 0):
        sendPayload(f(s[4:6]), 0x11 if status[f(s[4:6])] == True else 0x00)
        count = 5
    count -= 1
    if (sensor_data[f(s[4:6])] >= threshold[f(s[4:6])]):
        state = True
    else:
        state = False
    if(state != status[f(s[4:6])]):
        sendPayload(f(s[4:6]), 0x11 if state == True else 0x00)
        status[f(s[4:6])] = state
    print status
    print threshold
    print sensor_data
    client.publish('v1/devices/me/telemetry', json.dumps(sensor_data), 1)

def decode_float(s):
    #s=s[6:8] + s[4:6] + s[2:4] + s[0:2]
    #i=int(s,16)
    #cp=pointer(c_int(i))
    #fp=cast(cp, POINTER(c_float))
    #return fp.contents.value
    return unpack('<f', unhexlify(s))[0]

def CRC(s):
    sum=1
    for x in range(0,len(s),2):
        try:
            sum += int(s[x:x+2],16) 
        except ValueError as verr:
            return '0'
    #print s[14:16]
    #print format(sum>>4, 'X')
    return format(sum>>4,'02X')

ser = serial.Serial(
    port='/dev/ttyS0',
    baudrate=9600,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    timeout=0.5,
    inter_byte_timeout=0.1
)

ser.flushInput()

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.username_pw_set(ACCESS_TOKEN)
client.connect(THINGSBOARD_HOST, 1883, 60)
client.loop_start()

try:
    while ser.inWaiting:
#    while True:
        sum = 0
        s = ser.readline()
        if(s[0:2] == '00' and s[16:] == '01'):
            #print decode_float(s[6:14])
            print s
            if(s[14:16] == CRC(s[0:14])):
                upload_data(s.upper())
            else:
                print '0'
        time.sleep(2)
except KeyboardInterrupt:
    ser.close()
