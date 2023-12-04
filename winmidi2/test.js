


const midi2 = require('.');

const loopbackAId = midi2.MidiEndpointDeviceInformation.diagnosticsLoopbackAEndpointId;
const loopbackBId = midi2.MidiEndpointDeviceInformation.diagnosticsLoopbackBEndpointId;



    console.log("Testing MIDI clock time");
    console.log(midi2.MidiClock.now);


// create a new session
var session = midi2.MidiSession.createSession("Electron Test Session");

console.log("Creating a sender connection");

// connect to loopback A
var sendConnection = session.createEndpointConnection(loopbackAId);
var receiveConnection = session.createEndpointConnection(loopbackBId);

// wire up the event handler for incoming messages.
// loopback A and B are hard-wired together in the service, so any message
// send out on A will arrive in on B and vice versa

console.log("Wiring up event handler");

const messageReceiveHandler = (sender, args) => {
    // there are several ways to read the incoming message.
    // One is to use strongly-typed message types. Another is to read an array, and still another is to
    // get back an interface you will cast to an appropriate type. Lots of options there, and different
    // ones work better in different client languages, and they have different amounts of overhead.

    var packet = args.getMessagePacket();

    if (packet.packetType === midi2.MidiPacketType.universalMidiPacket32) {
        const ump = midi2.MidiMessage32.castFrom(packet);

        // output in hex
        console.log(args.timestamp.toString(10) + ", 0x" + ump.word0.toString(16));
    }
    else if (packet.packetType === midi2.MidiPacketType.universalMidiPacket64) {
        const ump = midi2.MidiMessage64.castFrom(packet);

        // output in hex
        console.log(args.timestamp.toString(10) + ", 0x" + ump.word0.toString(16) + ", 0x" + ump.word1.toString(16));
    }
    else if (packet.packetType === midi2.MidiPacketType.universalMidiPacket96) {
        const ump = midi2.MidiMessage96.castFrom(packet);

        // output in hex
        console.log(args.timestamp.toString(10) + ", 0x" + ump.word0.toString(16) + ", 0x" + ump.word1.toString(16) + ", 0x" + ump.word2.toString(16));
    }
    else if (packet.packetType === midi2.MidiPacketType.universalMidiPacket128) {
        const ump = midi2.MidiMessage128.castFrom(packet);

        // output in hex
        console.log(args.timestamp.toString(10) + ", 0x" + ump.word0.toString(16) + ", 0x" + ump.word1.toString(16) + ", 0x" + ump.word2.toString(16) + ", 0x" + ump.word3.toString(16));
    }

}

receiveConnection.on("MessageReceived", messageReceiveHandler);

console.log("Opening the connection");

// connection needs to be opened before it is used
sendConnection.open();
receiveConnection.open();


    console.log("About to enumerate endpoints");

    // Enumerate endpoints
    const endpoints = midi2.MidiEndpointDeviceInformation.findAll(
        midi2.MidiEndpointDeviceInformationSortOrder.name, 0xFFFF
        // midi2.MidiEndpointDeviceInformationFilter.includeDiagnosticLoopback |
        // midi2.MidiEndpointDeviceInformationFilter.includeClientUmpNative |
        //midi2.MidiEndpointDeviceInformationFilter.includeClientByteStreamNative
);

    console.log("Endpoints enumerated");

    console.log(endpoints);

    for (var i = 0; i < endpoints.size; i++)
    {
        var endpoint = endpoints.getAt(i);

        console.log(endpoint.id);
        console.log(endpoint.deviceInstanceId);
        console.log(endpoint.name);
        console.log(endpoint.description);
        console.log(endpoint.transportMnemonic);
        console.log("------------------------------------------------");
        console.log("");
    }

    console.log("About to get diagnostics endpoint Ids");



    console.log("Creating a new session");



    console.log("Sending messages");

    // send messages out to that endpoint
    for (var j = 0; j < 1000; j++)
    {
        sendConnection.sendMessageWords(midi2.MidiClock.now, 0x48675309, 0xDEADBEEF);
    }

    console.log("Closing session");

    session.close();


