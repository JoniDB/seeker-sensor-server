const osc = require("osc");
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline
const io = require('socket.io-client');

// ID's
/*
1 = -210585400 = pilot
2 = 602762519 = commander
3 = 24826706 = Zoologist
4 = 2080284636 = Director
*/
let idRef = {
    '-210585400': 1,
    '602762519': 2,
    '24826706': 3,
    '2080284636': 4
}

//------ SETTINGS ---------------------------------
const settings = {
    baudRate: 115200,
    oscInputPort: 1234,
    oscOutputPort: 2345,
    serialAddress: '/dev/cu.usbmodem141232',
    socketServer: 'ws://seekercomm.herokuapp.com'
};

//------ GLOBALS ---------------------------------  
const crew = [
    {
        x: 0,
        y: 0,
        z: 0,
        direction: 0,
        gsr: 0,
        bpm: 0,
        bpmDiff: 0,
        temperature: 0,
        id: 1
    }, {
        x: 0,
        y: 0,
        z: 0,
        direction: 0,
        gsr: 0,
        bpm: 0,
        bpmDiff: 0,
        temperature: 0,
        id: 2
    }, {
        x: 0,
        y: 0,
        z: 0,
        direction: 0,
        id: 4,
        gsr: 0,
        bpm: 0,
        bpmDiff: 0,
        temperature: 0,
        id: 3
    }, {
        x: 0,
        y: 0,
        z: 0,
        direction: 0,
        gsr: 0,
        bpm: 0,
        bpmDiff: 0,
        temperature: 0,
        id: 4
}];

let crewAverage = {
    x: 0,
    y: 0,
    z: 0,
    direction: 0,
    gsr: 0,
    bpm: 0,
    bpmDiff: 0,
    temperature: 0,
};

    const mappings = {
    bpm: {
        min: 20,
        max: 200
    },
    bpmDiff: {
        min: -40,
        max: 40
    },
    gsr: {
        min: 0,
        max: 1024
    },
    temperature: {
        min: 0,
        max: 50
    },
    x: {
        min: -2048,
        max: 2048
    },
    y: {
        min: -2048,
        max: 2048
    },
    z: {
        min: -2048,
        max: 2048
    }
}

const parser = new Readline();

const serialPort = new SerialPort(settings.serialAddress, {
    baudRate: settings.baudRate
  }, function (err) {
    if (err) {
      return console.log('Error: ', err.message);
    }
});

const socket = io.connect(settings.socketServer, { reconnection: true});
//optional: { forceNew: true }

/*
const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: settings.oscInputPort
});
*/
//-------OSC-------------------------------------

//listen events
//send osc message to server
/*
udpPort.on("message", function(oscMsg) {
    messages[oscMsg.address] = oscMsg.args;
    socket.emit("/oscUpdate", {name: oscMsg.address, value:oscMsg.args})
});

udpPort.open();
*/
//-------SOCKET----------------------------------
socket.on('connect', function () {
    console.log('connected to server');
});

socket.on( 'disconnect', function () {
    console.log( 'disconnected from server' );
});

socket.on("/sensor/give", () => {
    socket.emit("/sensor/receive", {crew});
});

//------ SERIAL ---------------------------------
serialPort.pipe(parser)
parser.on('data', function (data) {
    if (data != null || data != "" || data != undefined) {
        try {
            let parsed = JSON.parse(data);
            let mappedValue = mapValue(parsed.n, parsed.v);
            updateCrewData(parsed.s, parsed.n, mappedValue);
            //sendOscCrewData(parsed.s, parsed.n, parsed.v);
            //socket.emit('/updateCrewData', parsed);
            console.log('data received mapped:', parsed.n, mappedValue);
        } catch (error) {
            console.log(error);
        }
    }
});

parser.on('error', function (err) {
    console.error('Hmm..., error!');
    console.error(err);
    process.exit(1);
  });


//------ crew ---------------------------------
function mapValue(property, value) {
    if(mappings.hasOwnProperty(property)) {
        let max = mappings[property].max;
        let min = mappings[property].min;
        if (value > max) {
            value = max
        }
        if (value < min) {
            value = min
        }
        let v = (value - min) / (max - min);
        return v;
    } else {
        return 0;
    }
}
function updateCrewData(s, property, value) {
    let id = 1;
    if (idRef.hasOwnProperty(s)) {
        id = idRef[s];
        console.log(id);
    }
    crew[id-1][property] = value;
    console.log(crew);
}

function updateCrewAverage(property, value) {
    let average = 0;
    crew.forEach((member, index) => {
        average += member[property];
    })
    average = average/4;
    crewAverage[property] = average;
    //sendOscCrewData(property, average);
}

function sendOscCrewData(name, value) {
    //maybe calculate some averages of weet ik veel
    let address = `/${name}`;
    sendOscData(address, value);
}

function sendOscData(message, value) {
    udpPort.send({
        address: message,
        args: value
    }, "127.0.0.1", settings.oscOutputPort);
}
