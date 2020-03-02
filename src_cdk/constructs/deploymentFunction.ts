import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as events from "@aws-cdk/aws-events";
import * as destinations from "@aws-cdk/aws-lambda-destinations";

interface DeploymentFunctionProps {
    stages: { id: string, name: string }[] // warning: logical IDs
    eventBusName: string // warning logical ID
    role: iam.IRole
}

export class DeploymentFunction extends cdk.Construct {

    private fn: lambda.Function;
    get functionArn() { return this.fn.functionArn };
    get functionName() { return this.fn.functionName };

    constructor(construct: cdk.Construct, id: string, props: DeploymentFunctionProps) {
        super(construct, id);

        const eb = events.EventBus.fromEventBusArn(this, "EventBus",
            cdk.Fn.sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${AWS::AccountId}:event-bus/\${${props.eventBusName}}`))

        this.fn = new lambda.Function(this, "Resource", {
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: new lambda.InlineCode("here some code"),
            onSuccess: new destinations.EventBridgeDestination(eb)
        });

        this.fn.grantInvoke(props.role)

        props.stages.forEach(({ id, name }, idx) => {
            const rule = new events.CfnRule(this, `Rule0${idx}`, {
                eventBusName: cdk.Fn.ref(props.eventBusName),
                name: cdk.Fn.ref(name),
                targets: [
                    { 
                        id: name, 
                        arn: cdk.Fn.sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${${id}}:event-bus/\${${props.eventBusName}}`)
                    }
                ],
                eventPattern: {
                    "source": [ "lambda" ],
                    "detail-type": [ "Lambda Function Invocation Result - Success" ],
                    "detail": [{
                        "requestContext": [{
                            "functionArn": [ this.fn.functionArn ]
                        }],
                        "responsePayload": [{
                            "account": [ cdk.Fn.ref(id) ],
                            "stage": [ cdk.Fn.ref(name) ]
                        }]
                    }]
                }
            });
            // Only create a forwarding if target is another account
            rule.cfnOptions.condition = new cdk.CfnCondition(this, `CreateForwardingRule0${idx}`, {
                expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(id, cdk.Aws.ACCOUNT_ID))
            })
        });
    }
}