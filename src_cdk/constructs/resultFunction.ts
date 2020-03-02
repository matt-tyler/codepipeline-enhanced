import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as sam from "@aws-cdk/aws-sam";

interface ResultFunctionProps {
    accounts: { id: string }[]
}

export class ResultFunction extends cdk.Construct {

    private fn: sam.CfnFunction;
    get functionArn() { return cdk.Fn.sub(`${this.fn.logicalId}.Arn`) };

    constructor(construct: cdk.Construct, id: string, props: ResultFunctionProps) {
        super(construct, id);

        this.fn = new sam.CfnFunction(this, "Resource", {
            runtime: lambda.Runtime.NODEJS_12_X.toString(),
            codeUri: "./result",
            handler: "index.handler",
        });

        this.fn.addPropertyOverride("Policies", [
            "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess",
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            { "CodePipelineLambdaExecutionPolicy": {} }
        ]);

        props.accounts.forEach(({ id }, idx) => new lambda.CfnPermission(this, `Permission0${idx}`, {
            action: "lambda:InvokeFunction",
            functionName: this.functionArn,
            principal: cdk.Fn.sub(`arn:aws:iam::\${${id}}:root`)
        }));
    }
}