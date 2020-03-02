import * as cdk from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const dir = "./.aws-sam/build";

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

import PipelineStack from "./stacks/pipeline";
import SourceActionStack from "./stacks/source";

const app = new cdk.App();

new SourceActionStack(app, "source");

for (let i = 2; i < 4; i++) {
    new PipelineStack(app, `pipeline0${i}`, { stages: i });
}

const assembly = app.synth();

for (const stack of assembly.stacks.filter(stack => stack.originalName.startsWith("pipeline"))) {
    const out = path.join(dir, `pipeline`);
    if (!fs.existsSync(out)) {
        fs.mkdirSync(out);
    }
    const document = yaml.safeDump(stack.template);
    fs.writeFileSync(path.join(out, `${stack.originalName.toLowerCase()}.template.yaml`), document);
};

for (const stack of assembly.stacks.filter(stack => stack.originalName.startsWith("source"))) {
    const out = path.join(dir, `source`);
    if (!fs.existsSync(out)) {
        fs.mkdirSync(out);
    }
    const document = yaml.safeDump(stack.template);
    fs.writeFileSync(path.join(out, `${stack.originalName.toLowerCase()}.template.yaml`), document);
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

