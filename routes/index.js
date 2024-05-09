var express = require('express');
const axios = require('axios');
var mqtt = require('mqtt');
const { NodeProperty, Project, Workspace, CountType, NodeType } = require("epanet-js");
const { response } = require('express');
var router = express.Router();
var fs = require('fs');
const { Console } = require('console');

const thingsboardDevices = {

  Hatzenbuhl: 0,
  Rulzheim: 1,
  Worth: 2,
  Jockgrim: 3,
  Kuhardt: 4,
  Knittelsheim: 5
}


/* GET home page. */
router.get('/', function (req, res, next) {
  console.log("logging in");
  //EpanetCalculation(0.001);
  Login();
  //SubscribedDevices();
  res.render('index', { title: 'Express' });
});

module.exports = router;

function Login() {
  var token = "";
  axios.post('http://....', {
    username: 'xxxxx',
    password: 'xxxxx'
  })
    .then(function (response) {
      if (response.data.token) {
        token = response.data.token;
        console.log("token: "+token);
        //SubscribedDevices();
        //GetTelemertryData(token);

        EpanetCalculation(token);
        //EpanetCalculation(token, WT_Hatzenbühl_data(token), WT_Rulzheim_data(token), WT_Worth_data(token), Wasserwerk_Jockgirm_data(token), Wasserwerk_Kuhardt_data(token), DEA_Knittelsheim_data(token));

      }
    })
    .catch(function (error) {
      console.log("Could not login, " + error);
    });

  return token;
}

// 'BASE/DEVICE/e3f13720-de48-11eb-8f90-0f87b550f6c6/values/timeseries'
function GetTelemertryData(Token) {
  axios.get('BASE/DEVICE/39805350-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {
    console.log("==============================================================================");

    console.log(response.data.Niveau[0].value);
    console.log("==============================================================================");
    if (response.data.TankLevel) {
      var value = Number(response.data.TankLevel[0].value);
      console.log("tankValue " + value);
      var calculatedvalue = EpanetCalculation(value);
      send2Thingsboard(calculatedvalue);

    }

  })
    .catch(function (error) {
      console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
      console.log(error);
    });
}

function send2Thingsboard(pValue) {
  const thingsboardHost = ".";
  const ACCESS_TOKEN = ".";

  // Initialization of mqtt client using Thingsboard host and device access token
  console.log('Connecting to: %s using access token: %s', thingsboardHost, ACCESS_TOKEN);
  var client = mqtt.connect('tcp://' + thingsboardHost, { username: ACCESS_TOKEN });


  client.on('connect', function () {
    client.subscribe('v1/devices/me/rpc/request/+', function (err) {
      if (!err) {
        client.publish("v1/devices/me/telemetry", "{'Pressure'" + pValue + "}");
      }
    })
  })

}


function EpanetCalculation(token) {  // more paramters from the 6 devices

  //var hatzen, rulzheim, worth, jockgirm, kuhardt, dea;

  var dataPromiseArray = [

    WT_Hatzenbühl_data(token),
    WT_Rulzheim_data(token),
    WT_Worth_data(token),
    Wasserwerk_Jockgirm_data(token),
    Wasserwerk_Kuhardt_data(token),
    DEA_Knittelsheim_data(token)
  ];

  // WT_Hatzenbühl.then(response => {
  //   hatzen = (response.Niveau[0].value) / 100;
  //   console.log("hatzen " + hatzen);
  // });


  const net = fs.readFile('./public/example.txt', 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    // console.log("File Read Succesfully");
    // console.log(data);

    //const net1 = fs.readFileSync("./public/Jockgrim_Modified_State.inp");
    const net1 = fs.readFileSync("./public/SimpleNetwork.inp");

    const ws = new Workspace();
    const model = new Project(ws);

    ws.writeFile("net1.inp", net1);

    model.open("net1.inp", "report.rpt", "out.bin");


    const nodeCount = model.getCount(CountType.NodeCount);

    //const n11Index = model.getNodeIndex("11");
    //console.log("index " + n11Index);
    // FIRST FILE IS CHANGED THEN HYDRAULICS SIM IS RUN

    //  model.setNodeValue(26,NodeProperty.TankLevel,TankValue);
    //  model.openH();
    //  model.initH(0);
    //  const cTime = model.runH(); // could send the output from simulation to thingsboard

    // let devices = ["Hatz", "Rulz", "Wor","Jockgrim", "Kuhardt", "Knittel"];

    // devices.forEach(element => {
    //   this[element+"Index"] = model.getNodeIndex(element);
    //   console.log(this); 

    // });

    //   for (let i = 1; i <= nodeCount; i++) {
    //   //counting += i;
    //   if (model.getNodeType(i) != undefined && model.getNodeType(i) === NodeType.Tank) {
    //     const nodeId = model.getNodeId(i);
    //     console.log("nodeID: "+nodeId + " node Index: "+ i)

    //       nodeProp = model.getNodeValue(i, j);
    //       console.log("index of node Property: "+nodeProp);

    // }}



    const hatzIndex = model.getNodeIndex("Hatz");  // minus -11 to get line number on file
    const rulzIndex = model.getNodeIndex("Rulz");  // minus -11 to get line number on file
    const worthIndex = model.getNodeIndex("Wor");
    const jockgrimIndex = model.getNodeIndex("Jockgrim");
    const kuhardtIndex = model.getNodeIndex("Kuhardt");
    const deaIndex = model.getNodeIndex("Knittel");    // minus -11 to get line number on file

    var hatzElevation = model.getNodeValue(hatzIndex, NodeProperty.TankLevel); // no tanklevel in INP file
    var rulzElevation = model.getNodeValue(rulzIndex, NodeProperty.TankLevel);
    var worthElevation = model.getNodeValue(worthIndex, NodeProperty.TankLevel);
    // var jockgrimElevation = model.getNodeValue(jockgrimIndex, NodeProperty.Demand);
    // var kuhardtElevation = model.getNodeValue(kuhardtIndex, NodeProperty.Demand);
    // var deaElevation = model.getNodeValue(deaIndex, NodeProperty.Demand);
    var jockgrimElevation = (model.getBaseDemand(jockgrimIndex, 1)) / 3600;  //conversion from m³/h to m³/s
    var kuhardtElevation = (model.getBaseDemand(kuhardtIndex, 1)) / 3600;          //conversion from m³/h to m³/s
    var deaElevation = (model.getBaseDemand(deaIndex, 1)) / 3600;                  //conversion from m³/h to m³/s


    // for (let i=0; i<=30; i++){

    //   try{
    // var deaDemnd=model.getNodeValue(deaIndex, i);
    // console.log("Index: "+i+" dea: "+deaDemnd);
    //   }catch(exception){ }
    // }

    console.log("indexes " + hatzIndex + " " + rulzIndex + " " + worthIndex + " " + jockgrimIndex + " " + kuhardtIndex + " " + deaIndex);
    console.log("values before change in INP file: " + hatzElevation.toFixed(2) + " " + rulzElevation.toFixed(2) + " " + worthElevation.toFixed(2) + " " + jockgrimElevation.toFixed(2) + " " + kuhardtElevation.toFixed(2) + " " + deaElevation.toFixed(2));

    Promise.all(dataPromiseArray)
      .then((values) => {
        // console.log(values[thingsboardDevices.Kuhardt]);
        // console.log((values[thingsboardDevices.Knittelsheim].Menge[0].value) / 100);

        let hatzen = (values[thingsboardDevices.Hatzenbuhl].Niveau[0].value) / 100;
        let rulzheim = (values[thingsboardDevices.Rulzheim].Niveau[0].value) / 100;
        let worth = (values[thingsboardDevices.Worth].Niveau[0].value) / 100;
        let jockgrim = -(Number(values[thingsboardDevices.Jockgrim].Menge[0].value));
        let kuhardt = -((values[thingsboardDevices.Kuhardt].MengeL1[0].value / 10) + (values[thingsboardDevices.Kuhardt].MengeL2[0].value / 10) + (values[thingsboardDevices.Kuhardt].MengeLeimersheim[0].value / 100));
        let dea = (values[thingsboardDevices.Knittelsheim].Menge[0].value) / 100;

        console.log("THINGSBOARD VALUES: " + hatzen + " " + rulzheim + " " + worth + " " + jockgrim + " " + kuhardt + " " + dea);
        model.setNodeValue(hatzIndex, NodeProperty.TankLevel, hatzen);
        model.setNodeValue(rulzIndex, NodeProperty.TankLevel, rulzheim);
        model.setNodeValue(worthIndex, NodeProperty.TankLevel, worth);
        model.setBaseDemand(jockgrimIndex, 1, jockgrim);
        model.setBaseDemand(kuhardtIndex, 1, kuhardt);
        model.setBaseDemand(deaIndex, 1, dea);

        hatzElevation = model.getNodeValue(hatzIndex, NodeProperty.TankLevel);
        rulzElevation = model.getNodeValue(rulzIndex, NodeProperty.TankLevel);
        worthElevation = model.getNodeValue(worthIndex, NodeProperty.TankLevel);
        jockgrimElevation = (model.getBaseDemand(jockgrimIndex, 1)) / 3600;
        kuhardtElevation = (model.getBaseDemand(kuhardtIndex, 1)) / 3600;
        deaElevation = (model.getBaseDemand(deaIndex, 1)) / 3600;

        console.log("indexes " + hatzIndex + " " + rulzIndex + " " + worthIndex);
        console.log("values after change in INP file: " + hatzElevation.toFixed(2) + " " + rulzElevation.toFixed(2) + " " + worthElevation.toFixed(2) + " " + jockgrimElevation.toFixed(2) + " " + kuhardtElevation.toFixed(2) + " " + deaElevation.toFixed(2));

        model.saveInpFile("net1.inp");

        const index = model.getNodeIndex("Kuhardt");
        model.openH();
        model.initH(11);
        //model.runH();

        let tStep = Infinity;
        do {
          const cTime = model.runH();
          const Kuhdardtdemand = model.getNodeValue(index, NodeProperty.Demand);
          console.log(
            `Current Time: - ${cTime}, Node Kuhardt Demand: ${Kuhdardtdemand.toFixed(2)}`
          );

          tStep = model.nextH();
        } while (tStep > 0);

        model.saveH();
        model.closeH();
        //model.initH(11);
        //model.runH();
        //model.solveH();
        //console.log("hyd run "+ run);
        //model.saveHydFile("net1_hydraulics.rpt");
        //model.closeH();



        // var file = ws.readFile("net1.inp", 'utf8');
        // fs.writeFile('./public/net1.inp', file, function () { console.log("f") });
        // var hydfile = ws.readFile("net1_hydraulics.rpt", 'utf8');
        // fs.writeFile('./public/net1_hydraulics.rpt', hydfile, function () { console.log("g") });
        // var hydfile = ws.readFile("net1_hydraulics", 'utf8');
        // console.log("hydraulics file: "+hydfile);

      });



    // var sepecifcnode = model.getNodeValue(14, NodeProperty.Pressure);
    // model.saveInpFile("Jockgrim_Modified_State_modified.inp");
    // model.saveInpFile("net1.inp");

    // var modfile = ws.readFile("net1.inp", 'utf8');
    // fs.writeFile('./public/Jockgrim_Modified_State_modified.inp', modfile, function (err) {
    //   if (err) {
    //     //console.log(err);
    //     return;
    //   }

    // var modfile = ws.readFile("Jockgrim_Modified_State_modified.inp", 'binary');
    // fs.writeFile('./public/Jockgrim_Modified_State_modified.inp', modfile, function (err) {
    //   if (err) {
    //     //console.log(err);
    //     return;
    //   }

    //   console.log('file saved');
    // });
    // return sepecifcnode;          /// send this value to thingsboard

  });

  //close();
}



async function WT_Hatzenbühl_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/39805350-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(response => {

    if (response)
      resp_val = response.data;

  })
    .catch(error => {
      console.log(error);
    });

  // .catch(function (error) {
  //   console.log(error);
  // });

  return resp_val;

}


async function WT_Rulzheim_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/308325c0-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {

    if (response)
      resp_val = response.data;

  })
    .catch(error => {
      console.log(error);
    });

  return resp_val;
}

async function WT_Worth_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/260db010-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {

    if (response)
      resp_val = response.data;

  })
    .catch(error => {
      console.log(error);
    });

  return resp_val;
}

async function Wasserwerk_Jockgirm_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/47a69c00-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {
      
    if (response)
      resp_val = response.data;

  })
    .catch(error => {
      console.log(error);
    });

  return resp_val;
}

async function Wasserwerk_Kuhardt_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/5124b960-7da1-11eb-81e7-7bf4b1b85926/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {

    if (response)
      resp_val = response.data;
      console.log("kuhardt keys: " + resp_val);

  })
    .catch(error => {
      console.log(error);
    });

  return resp_val;
}

async function DEA_Knittelsheim_data(Token) {
  var resp_val;
  await axios.get('BASE/DEVICE/5d4e7e30-f423-11eb-88d0-df9159a9b3d4/values/timeseries',
    { headers: { "X-Authorization": `Bearer ${Token}`, "Content-Type": "application/json" } }
  ).then(function (response) {

    if (response)
      resp_val = response.data;

  })
    .catch(error => {
      console.log(error);
    });

  return resp_val;
}


function SubscribedDevices() {
  const thingsboardHost = "URL";

  // Water Tower devices
  const WT_Hatzenbühl = "code";  //n9IqRbv633DvwV8j6Zqb
  const WT_Rülzheim = "code";
  const WT_Wörth = "code";

  //Water Plant devices
  const Wasserwerk_Jockgirm = "code";
  const Wasserwerk_Kuhardt = "code";

  // DEA Plant
  const DEA_Knittelsheim = "code";

  // Initialization of mqtt client using Thingsboard host and device access token
  //console.log('Connecting to: %s using access token: %s', thingsboardHost, ACCESS_TOKEN);
  var WT_Hatzenbühl_client = mqtt.connect('tcp://' + thingsboardHost, { username: WT_Hatzenbühl });
  var WT_Rülzheim_client = mqtt.connect('tcp://' + thingsboardHost, { username: WT_Rülzheim });
  var WT_Wörth_client = mqtt.connect('tcp://' + thingsboardHost, { username: WT_Wörth });

  var Wasserwerk_Jockgirm_client = mqtt.connect('tcp://' + thingsboardHost, { username: Wasserwerk_Jockgirm });
  var Wasserwerk_Kuhardt_client = mqtt.connect('tcp://' + thingsboardHost, { username: Wasserwerk_Kuhardt });

  var DEA_Knittelsheim_client = mqtt.connect('tcp://' + thingsboardHost, { username: DEA_Knittelsheim });

  console.log("hatzenhuhl: ");
  //console.log(WT_Hatzenbühl_client);

  console.log("000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
  WT_Hatzenbühl_client.on('connect', function () {
    WT_Hatzenbühl_client.subscribe('v1/devices/+/telemetry/+');
  });

  WT_Hatzenbühl_client.on('message', function (topic, message) {
    //   console.log('response.topic: ' + topic);
    //   console.log('response.body: ' + message.toString());
  });

  WT_Rülzheim_client.on('message', function (topic, message) {
    // console.log('response.topic: ' + topic);
    // console.log('response.body: ' + message.toString());
  });

  WT_Wörth_client.on('message', function (topic, message) {
    // console.log('response.topic: ' + topic);
    // console.log('response.body: ' + message.toString());
  });

  Wasserwerk_Jockgirm_client.on('message', function (topic, message) {
    // console.log('response.topic: ' + topic);
    // console.log('response.body: ' + message.toString());
  });

  Wasserwerk_Kuhardt_client.on('message', function (topic, message) {
    // console.log('response.topic: ' + topic);
    // console.log('response.body: ' + message.toString());
  });

  DEA_Knittelsheim_client.on('message', function (topic, message) {
    // console.log('response.topic: ' + topic);
    // console.log('response.body: ' + message.toString());
  });

}

