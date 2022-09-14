import { Project, Workspace, NodeProperty } from "epanet-js";

import modelInp from "./model";

console.clear();

const net1 = modelInp;

const ws = new Workspace();
const model = new Project(ws);

ws.writeFile("net1.inp", net1);

model.open("net1.inp", "report.rpt", "out.bin");

const n11Index = model.getNodeIndex("11");

// Accessing before model open fails
const demandBeforeOpen = model.getNodeValue(n11Index, NodeProperty.Pressure);
console.log(`Demand before open equals: ${demandBeforeOpen}`);

// Use getBaseDemand
const baseDemand = model.getBaseDemand(n11Index, 1);
console.log(`Base demand before open equals: ${baseDemand}`);

model.openH();
model.initH(11);

let tStep = Infinity;
do {
  const cTime = model.runH();
  const pressure = model.getNodeValue(n11Index, NodeProperty.Pressure);
  const demand = model.getNodeValue(n11Index, NodeProperty.Demand);
  console.log(
    `Current Time: - ${cTime}, Node 11 Pressure: ${pressure.toFixed(
      2
    )}, Node Demand: ${demand}`
  );

  tStep = model.nextH();
} while (tStep > 0);

model.saveH();
model.closeH();

document.getElementById("app").innerHTML = `
<h1>Open Console!</h1>

`;
