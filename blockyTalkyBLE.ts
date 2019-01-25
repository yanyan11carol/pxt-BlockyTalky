 
//% color=#0062dB weight=96 icon="\uf294" block="blockytalky BLE"
namespace blockyTalkyBLE {
    let delimiter = "^";
    let terminator = "#";
    let handlers: LinkedKeyHandlerList = null;

    enum ADKeys {
        A = 1,
        B = 2,
        C = 3,
        D = 4,
        E = 5
    }

    enum OnOff {
        Off = 0,
        On = 1
    }

        let crashSensorPin: DigitalPin;
    /**
     Returns the value of the moisture sensor on a scale of 0 to 100.
     */
    //% blockId=octopus_moisture weight=10 blockGap=22
    //% block="value of moisture sensor at pin %p"
    export function MoistureSensor(p: AnalogPin): number {
        return pins.map(pins.analogReadPin(p), 0, 950, 0, 100);
    }
    /**
     Toggles an LED on or off.
     */
    //% blockId=octopus_led weight=100 blockGap=30
    //% block="toggle LED at pin %p | %state"
    export function LED(p: DigitalPin, state: OnOff): void {
        pins.digitalWritePin(p, state);
    }

    /**
   Checks if the specified key on the ADkeyboard is pressed.
     */

    //% blockId=octopus_adkeyboard weight=90 blockGap=30
    //% block="key %k | is pressed on ADKeyboard at pin %p"
    export function ADKeyboard(k: ADKeys, p: AnalogPin): boolean {
        let a: number = pins.analogReadPin(p);
        if (a < 10 && k == 1) {
            return true;
        } else if (a >= 40 && a <= 60 && k == 2) {
            return true;
        } else if (a >= 80 && a <= 110 && k == 3) {
            return true;
        } else if (a >= 130 && a <= 150 && k == 4) {
            return true;
        } else if (a >= 530 && a <= 560 && k == 5) {
            return true;
        } else return false;
    }

    /**
   Checks whether the motion sensor is currently detecting any motion.
     */

    //% blockId=octopus_pir weight=80 blockGap=30
    //% block="motion detector at pin %p | detects motion"
    export function PIR(p: DigitalPin): boolean {
        let a: number = pins.digitalReadPin(p);
        if (a == 1) {
            return true;
        } else return false;
    }

    /**
   Checks whether the crash sensor is currently pressed.
     */

    //% blockId=octopus_crash weight=70 blockGap=30
    //% block="crash sensor pressed"
    export function crashSensor(): boolean {
        let a: number = pins.digitalReadPin(crashSensorPin);
        if (a == 0) {
            return true;
        } else return false;
    }


    /**
    IMPORTANT: Sets up the motion sensor.
     */


    //% blockId=octopus_crashsetup weight=75 blockGap=10
    //% block="Setup crash sensor at pin %p"
    export function crashSensorSetup(p: DigitalPin): void {
        crashSensorPin = p;
        pins.setPull(p, PinPullMode.PullUp)
    }

    
     
    
    
    
    class LinkedKeyHandlerList {
        key: string;
        type: ValueTypeIndicator;
        callback: (value: TypeContainer) => void;
        next: LinkedKeyHandlerList
    }

    enum ValueTypeIndicator { String, Number }

    export class TypeContainer {
        stringValue: string;
        numberValue: number;
    }

    let messageContainer = new TypeContainer;

    //% mutate=objectdestructuring
    //% mutateText="My Arguments"
    //% mutateDefaults="key,stringValue"
    //% blockId=blockyTalkyBLE_on_string_recieved
    //% block="on string received|key %theKey"
    export function onStringReceived(key: string, callback: (stringValue: TypeContainer) => void) {
        let newHandler = new LinkedKeyHandlerList()
        newHandler.callback = callback;
        newHandler.type = ValueTypeIndicator.String;
        newHandler.key = key;
        newHandler.next = handlers;
        handlers = newHandler;
     }


    //% mutate=objectdestructuring
    //% mutateText="My Arguments"
    //% mutateDefaults="key,numberValue"
    //% blockId=blockyTalkyBLE_on_number_received
    //% block="on number received|key %theKey"
    export function onNumberReceived(key: string, callback: (numberValue: TypeContainer) => void) {
        let newHandler = new LinkedKeyHandlerList()
        newHandler.callback = callback;
        newHandler.type = ValueTypeIndicator.Number;
        newHandler.key = key;
        newHandler.next = handlers;
        handlers = newHandler;
    }

    //% blockId=blockyTalkyBLE_send_string_key_value block="send string|key %key|value %value"
    export function sendMessageWithStringValue(key: string, value: string): void {
        sendRawMessage(key, ValueTypeIndicator.String, value)
    }

    //% blockId=blockyTalkyBLE_send_number_key_value block="send number|key %key|value %value"
    export function sendMessageWithNumberValue(key: string, value: number): void {
        sendRawMessage(key, ValueTypeIndicator.Number, value.toString())
    }

    function sendRawMessage(key: string, valueTypeIndicator: ValueTypeIndicator, value: string): void {
        let indicatorAsString = getStringForValueTypeIndicator(valueTypeIndicator);
        bluetooth.uartWriteString(indicatorAsString + delimiter + key + delimiter + value + terminator)
    }

    let splitString = (splitOnChar: string, input: string) => {
      let result:string[] = []
      let count = 0
      let startIndex = 0
      for (let index = 0; index < input.length; index++) {
          if (input.charAt(index) == splitOnChar) {
              result[count] = input.substr(startIndex, index - startIndex)

              startIndex = index + 1
              count = count + 1
          }
      }
      result[count] = input.substr(startIndex, input.length - startIndex)

      return result;
    }

    /**
     * Get string representation of enum.
     */
    function getStringForValueTypeIndicator(vti: ValueTypeIndicator) {
        switch (vti) {
            case ValueTypeIndicator.Number:
                return "N"
            case ValueTypeIndicator.String:
                return "S"
            default:
                return "!"
        }
    }

    /**
     * Get enum representation of string.
     */
    function getValueTypeIndicatorForString(typeString: string) {
        switch (typeString) {
            case "S":
                return ValueTypeIndicator.String
            case "N":
                return ValueTypeIndicator.Number
            default:
                return null
        }
    }

    /**
     * Handles any incoming message
     */
    export function handleIncomingUARTData() {
        let latestMessage = bluetooth.uartReadUntil(terminator)
        let messageArray = splitString(delimiter, latestMessage)

        let type = getValueTypeIndicatorForString(messageArray[0])
        let key = messageArray[1]
        let val = messageArray[2]

        if (type === ValueTypeIndicator.Number) {
            messageContainer.numberValue = parseInt(val)
        } else if (type === ValueTypeIndicator.String) {
            messageContainer.stringValue = val
        } else {
            messageContainer.stringValue = val
        }

        let handlerToExamine = handlers;


        while (handlerToExamine != null) {
            if (handlerToExamine.key == key && handlerToExamine.type == type) {
                handlerToExamine.callback(messageContainer)
            }
            handlerToExamine = handlerToExamine.next
        }
    }

    bluetooth.startUartService()
    basic.forever(() => {
        blockyTalkyBLE.handleIncomingUARTData()
    })
}
