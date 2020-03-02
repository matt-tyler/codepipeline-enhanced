import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";

interface ResultFunctionProps {
    accounts: { id: string }[]
}

export class ResultFunction extends cdk.Construct {

    private fn: lambda.Function;
    get functionArn() { return this.fn.functionArn };

    constructor(construct: cdk.Construct, id: string, props: ResultFunctionProps) {
        super(construct, id);

        this.fn = new lambda.Function(this, "Resource", {
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: "index.handler",
            code: new lambda.InlineCode("here some code"),
        });

        this.fn.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [ 
                "codepipeline:PutJobSuccessResult",
                "codepipeline:PutJobFailureResult"
            ],
            resources: [ 
                cdk.Fn.sub("arn:${AWS::Partition}:codepipeline:${AWS::Region}:${AWS::Account}:*")
            ]
        }));

        props.accounts.forEach(({ id }, idx) => new lambda.CfnPermission(this, `Permission0${idx}`, {
            action: "lambda:InvokeFunction",
            functionName: this.fn.functionArn,
            principal: cdk.Fn.sub(`arn:aws:iam::${id}:root`)
        }));
    }
}