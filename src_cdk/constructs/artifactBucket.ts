import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as kms from "@aws-cdk/aws-kms";
import * as iam from "@aws-cdk/aws-iam"
import { Fn } from "@aws-cdk/core";
import { AnyPrincipal } from "@aws-cdk/aws-iam";

interface ArtifactBucketProps {
    role: iam.IRole,
    stages: { id: string, name: string }[] // warning: logical IDs
}

export class ArtifactBucket extends cdk.Construct {

    private bucket: s3.IBucket;
    private key: kms.IKey;
    
    get bucketName() { return this.bucket.bucketName };
    get bucketArn() { return this.bucket.bucketArn };
    get keyArn() { return this.key.keyArn };

    constructor(construct: cdk.Construct, id: string, { role, stages }: ArtifactBucketProps) {
        super(construct, id);

        this.key = new kms.Key(this, "Key", {
            trustAccountIdentities: true,
        });

        stages.forEach(({ id }) => {
            this.key.addToResourcePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "kms:Encrypt",
                    "kms:Decrypt",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*",
                    "kms:DescribeKey"
                ],
                resources: [ "*" ],
                principals: [new AnyPrincipal()],
                conditions: {
                    "StringEquals": {
                        "kms:callerAccount": Fn.sub(`\${${id}}`),
                        "kms:calledVia": Fn.sub("s3.${AWS::Region}.amazonaws.com")
                    }
                }
            }))
        });

        this.bucket = new s3.Bucket(this, "Resource", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryptionKey: this.key
        });

        const bucketLogicalId = (this.bucket.node.findChild("Resource") as cdk.CfnResource)
            .logicalId;

        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [ "s3:GetObject*" ],
            principals: stages.map(({ id }) => new iam.ArnPrincipal(cdk.Fn.sub(`arn:aws:iam::\${${id}}:root`))),
            resources: [
                cdk.Fn.sub(`arn:\${AWS::Partition}:s3:::${bucketLogicalId}/*`)
            ]
        }));

        this.bucket.grantReadWrite(role);
    }
}