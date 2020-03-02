import * as cdk from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";


const dir = "./.dist";

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

import PipelineStack from "./stacks/pipeline";

const app = new cdk.App();

for (let i = 2; i < 4; i++) {
    new PipelineStack(app, `Pipeline0${i}`, {
        stages: i
    });
}

const assembly = app.synth();

for (const stack of assembly.stacks) {
    const out = path.join(dir, `pipeline`);
    if (!fs.existsSync(out)){
        fs.mkdirSync(out);
    }

    const document = yaml.safeDump(stack.template);
    fs.writeFileSync(path.join(out, `${stack.originalName}.template.yaml`), document);
};


// TwoStagePipeline, ThreeStagePipeline
// OneStagePipeline

// Pipeline Trigger -> Source ->  Pull Code -> Signal Back
// Pipelines listen for Branch

// Build ->  Ref/Commit/Zip -> Emit Event (Built)
// Pipeline listens for this event
// Custom Source needs access to bucket

// Reference to Source Bucket
// branch
// mode (tag or all)

// new Pipeline(stack, "Pipeline", {
//     eventBus: events.EventBus.fromEventBusArn(stack, "Bus", "arn:aws:events:ap-southeast-2:1234567890:events/default"),
//     stages: ["prod"],
//     gates: "true"
// });

