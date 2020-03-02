import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as events from "@aws-cdk/aws-events";
import * as sam from "@aws-cdk/aws-sam"

interface DeploymentFunctionProps {
    stages: { id: string, name: string }[] // warning: logical IDs
    eventBusName: string // warning logical ID
}

export class DeploymentFunction extends cdk.Construct {

    private fn: sam.CfnFunction;
    get functionArn() { return cdk.Fn.sub(`\${${this.fn.logicalId}}.Arn`) };
    get functionName() { return this.fn.ref };

    constructor(construct: cdk.Construct, id: string, props: DeploymentFunctionProps) {
        super(construct, id);

        const ebArn = cdk.Fn.sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${AWS::AccountId}:event-bus/\${${props.eventBusName}}`);

        this.fn = new sam.CfnFunction(this, "Resource", {
            runtime: lambda.Runtime.NODEJS_12_X.toString(),
            codeUri: "./deployment",
            handler: "index.handler"
        });

        this.fn.addPropertyOverride("Policies", [
            "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess",
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ["events:PutEvents"],
                        resources: ["*"]
                    })
                ]
            }).toJSON()
        ]);

        this.fn.addPropertyOverride("EventInvokeConfig", {
            DestinationConfig: {
                OnSuccess: { Type: "EventBridge", Destination: ebArn }
            }
        });

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
                            "functionArn": [ this.functionArn ]
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