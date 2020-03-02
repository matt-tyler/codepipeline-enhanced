import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";

import { Pipeline } from "../constructs/pipeline";

interface PipelineStackProps {
    stages: number
}

export default class PipelineStack extends cdk.Stack {
    constructor(construct: cdk.Construct, id: string, props: PipelineStackProps) {
        super(construct, id);
        this.templateOptions.metadata = {
            ParameterGroups: [],
            ParameterLabels: {}
        };

        const targets = [...new Array(props.stages)].map((v, idx) => {
            const name = new cdk.CfnParameter(this, `Stage0${idx + 1}FriendlyName`, {
                allowedPattern: "[a-zA-Z0-9]{1,5}",
                constraintDescription: "Environment name must consist of 1-5 alphanumeric characters"
            });
            const id = new cdk.CfnParameter(this, `Stage0${idx + 1}AccountId`);

            this.templateOptions.metadata!["ParameterGroups"].push({
                "Label": { "default": `Stage ${idx + 1}` },
                "Parameters": [ id.logicalId, name.logicalId ]
            });

            this.templateOptions.metadata!["ParameterLabels"][id.logicalId] = "Account ID";
            this.templateOptions.metadata!["ParameterLabels"][name.logicalId] = "Environment Name";

            return { name: name.logicalId, id: id.logicalId }
        })

        const eventBusParameter = new cdk.CfnParameter(this, "EventBusName", {
            type: "String",
            default: "default"
        });
        this.templateOptions.metadata!["ParameterGroups"].push({
            "Label": { "default": "System" },
            "Parameters": [ eventBusParameter.logicalId ]
        })
        this.templateOptions.metadata!["ParameterLabels"][eventBusParameter.logicalId]
            = "Event Bus Name";

        const gatesParameter = new cdk.CfnParameter(this, "ManualGates", {
            type: "String",
            default: "False",
            allowedValues: [ "False", "True" ]
        });

        this.templateOptions.metadata!["ParameterGroups"].push({
            "Label": { "default": "Options" },
            "Parameters": [ gatesParameter.logicalId ]
        });
        this.templateOptions.metadata!["ParameterLabels"][gatesParameter.logicalId]
            = "Enable Manual Gates";

        const gatesCondition = new cdk.CfnCondition(this, "NoGates", {
            expression: cdk.Fn.conditionEquals(gatesParameter.valueAsString, "False")
        });
        
        const eventBusArn = cdk.Fn.sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${AWS::AccountId}:event-bus/\${${eventBusParameter.logicalId}}`)

        new Pipeline(this, "Pipeline", {
            gates: gatesCondition,
            eventBusName: eventBusParameter.logicalId,
            stages: targets
        });
    }
}