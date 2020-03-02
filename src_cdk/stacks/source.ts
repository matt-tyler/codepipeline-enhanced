import * as cdk from "@aws-cdk/core";

import { SourceAction } from "../constructs/sourceAction";

export default class SourceActionStack extends cdk.Stack {
    constructor(construct: cdk.Construct, id: string) {
        super(construct, id);
        new SourceAction(this, "SourceAction");
    }
}