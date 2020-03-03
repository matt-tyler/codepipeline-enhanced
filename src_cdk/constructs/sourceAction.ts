import * as cdk from "@aws-cdk/core";
import * as cp from "@aws-cdk/aws-codepipeline";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as lambda from "@aws-cdk/aws-lambda";

export class SourceAction extends cdk.Construct {
    constructor(construct: cdk.Construct, id: string) {
        super(construct, id);

        const pollForJobs = new sfn.Task(this, "PollForJobs", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "PollForJobsFunction", {
                handler: "index.pollForJobsHandler",
                code: new lambda.InlineCode("something"),
                runtime: lambda.Runtime.NODEJS_12_X
            }), {
                payload: {
                    CodePipelineName: "$.CodePipelineName"
                }
            }),
            resultPath: "$.JobDetails"
        });

        const executePush = new sfn.Task(this, "ExecutePush", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "ExecutePushFunction", {
                handler: "index.executePushHandler",
                code: new lambda.InlineCode("This is my code"),
                runtime: lambda.Runtime.NODEJS_12_X
            }), {
                payload: {
                    CodeBuildProjectName: "",
                    S3Location: "$.JobDetails.S3Location",
                }
            }),
            resultPath: "$.JobDetails.CodeBuildExectionId"
        });

        const getStatus = new sfn.Task(this, "GetStatus", {
            task: new tasks.InvokeFunction(new lambda.Function(this, "WaitForSuccessFunction", {
                handler: "index.getStatusHandler",
                code: new lambda.InlineCode("This is my code"),
                runtime: lambda.Runtime.NODEJS_12_X
            }), {
                payload: {
                    CodeBuildExecutionId: "$.JobDetails.CodeBuildExecutionId",
                    JobId: "$.JobDetails.JobId"
                }
            }),
            resultPath: "$.JobDetails.JobStatus"
        });

        const signalFunction = new lambda.Function(this, "SignalResult", {
            handler: "index.getStatusHandler",
            code: new lambda.InlineCode("This is my code"),
            runtime: lambda.Runtime.NODEJS_12_X
        })

        const signalSuccess = new sfn.Task(this, "SignalSuccess", {
            task: new tasks.InvokeFunction(signalFunction)
        })

        const signalFailure = new sfn.Task(this, "SignalFailure", {
            task: new tasks.InvokeFunction(signalFunction, {
                payload: {
                    "JobStatus": "$.JobDetails.JobStatus",

                }
            })
        })

        // send success, send failure - functions
        const retryPolicy = {
            errors: [], backoffRate: 1.5, interval: cdk.Duration.seconds(5), maxAttempts: 5
        };

        pollForJobs.addRetry(retryPolicy);
        executePush.addRetry(retryPolicy);
        getStatus.addRetry(retryPolicy); // get Status

        // give it a 2 minute timeout
        const definition = pollForJobs
            .next(executePush)
            .next(getStatus)
            .next(new sfn.Choice(this, "Complete?")
                .when(sfn.Condition.stringEquals("$.JobDetails.JobStatus", "SUCCEEDED"), signalSuccess)
                .when(sfn.Condition.or(
                    sfn.Condition.stringEquals("$.JobDetails.JobStatus", "FAILED"),
                    sfn.Condition.stringEquals("$.JobDetails.JobStatus", "FAULT"),
                    sfn.Condition.stringEquals("$.JobDetails.JobStatus", "TIMED_OUT"),
                    sfn.Condition.stringEquals("$.JobDetails.JobStatus", "STOPPED"),
                ), signalFailure))
                
        new sfn.StateMachine(this, 'StateMachine', {
            definition,
            stateMachineType: sfn.StateMachineType.EXPRESS,
            timeout: cdk.Duration.minutes(5)
        });
                //     sfn.Condition.stringEquals("$.JobDetails.JobStatus", "SUCCEEDED"), Signal)
                // .)

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
                minimumCount: 0,
                maximumCount: 0
            },
            outputArtifactDetails: {
                minimumCount: 1,
                maximumCount: 1,
            }
        })
    }
}