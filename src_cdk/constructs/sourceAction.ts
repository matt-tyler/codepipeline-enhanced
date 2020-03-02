import * as cdk from "@aws-cdk/core";
import * as cp from "@aws-cdk/aws-codepipeline";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sam from "@aws-cdk/aws-sam";


export class SourceAction extends cdk.Construct {
    constructor(construct: cdk.Construct, id: string) {
        super(construct, id);

        const startPipeline = new sfn.Task(this, "StartPipeline", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "StartPipelineFunction", {
                handler: "index.handler",
                code: new lambda.InlineCode("This is my code"),
                runtime: lambda.Runtime.NODEJS_12_X
            })),
            inputPath: "$.CodePipelineArn",
            resultPath: "$.CodePipelineExecutionId"
        });

        const executeSourcePush = new sfn.Task(this, "ExecSourcePush", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "ExecSourcePushFunction", {
                handler: "index.handler",
                code: new lambda.InlineCode("This is my code"),
                runtime: lambda.Runtime.NODEJS_12_X
            }), {
                payload: {
                    CodeBuildArn: "",
                    CodePipelineExecutionId: "$.CodePipelineExecutionId",
                }
            }),
            inputPath: "Code Build Job Arn",
            resultPath: "$.CodeBuildExecutionId"
        });

        const waitForTerminal = new sfn.Task(this, "WaitForTerminal", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "WaitForTerminalFunction", {
                handler: "index.handler",
                code: new lambda.InlineCode("This is my code"),
                runtime: lambda.Runtime.NODEJS_12_X
            }), {
                payload: {
                    CodeBuildExecutionId: "$.CodeBuildExecutionId"
                }
            })
        });

        // send success, send failure - functions

        executeSourcePush.addRetry({
            errors: [],
            backoffRate: 1.5,
            interval: cdk.Duration.seconds(5),
            maxAttempts: 5
        });

        waitForTerminal.addRetry({
            errors: [ /* States.TaskFailed */],
            backoffRate: 1.5,
            interval: cdk.Duration.seconds(5),
            maxAttempts: 5
        });

        const action = new cp.CfnCustomActionType(this, "CustomAction", {
            category: "Source",
            provider: "Codepipeline-Enhanced",
            version: "1",
            configurationProperties: [{
                name: "PipelineName",
                key: true,
                queryable: true,
                secret: false,
                required: true
            }],
            inputArtifactDetails: {
                minimumCount: 1,
                maximumCount: 1
            },
            outputArtifactDetails: {
                minimumCount: 1,
                maximumCount: 1,
            }
        })
    }
}