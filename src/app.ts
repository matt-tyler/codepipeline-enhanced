import * as cdk from "@aws-cdk/core";

import PipelineStack from "./stacks/pipeline";

const app = new cdk.App();

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

new PipelineStack(app, "PipelineStack", {
    stages: 2
});

// new Pipeline(stack, "Pipeline", {
//     eventBus: events.EventBus.fromEventBusArn(stack, "Bus", "arn:aws:events:ap-southeast-2:1234567890:events/default"),
//     stages: ["prod"],
//     gates: "true"
// });

