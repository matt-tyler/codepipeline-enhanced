import * as cdk from "@aws-cdk/core";
import * as cp from "@aws-cdk/aws-codepipeline";
import * as iam from "@aws-cdk/aws-iam";
import * as events from "@aws-cdk/aws-events";

import { ArtifactBucket } from "./artifactBucket"
import { ResultFunction } from "./resultFunction";
import { DeploymentFunction } from "./deploymentFunction";

interface PipelineProps {
    eventBusName: string // warning: logical ID
    stages: { id: string, name: string }[] // warning: logical IDs
    gates: cdk.CfnCondition
}

export class Pipeline extends cdk.Construct {

    private deploymentFunction: DeploymentFunction;
    private deploymentRole: iam.Role;
    private manualRole: iam.Role;
    private resultFunction: ResultFunction;

    constructor(
        construct: cdk.Construct,
        id: string, 
        { eventBusName, gates, stages}: PipelineProps
    ) {
        super(construct, id);

        this.deploymentRole = new iam.Role(this, "DeploymentRole", {
            assumedBy: new iam.ArnPrincipal(cdk.Fn.sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:root`))
        });

        this.manualRole = new iam.Role(this, "ManualRole", {
            assumedBy: new iam.ArnPrincipal(cdk.Fn.sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:root`))
        })

        const deploymentRoleLogicalId = (this.deploymentRole.node.findChild("Resource") as cdk.CfnResource).logicalId;
        const manualRoleLogicalId = (this.manualRole.node.findChild("Resource") as cdk.CfnResource).logicalId;
    
        const role = new iam.Role(this, "Role", {
            assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
            inlinePolicies: {
                actions: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [ "sts:AssumeRole"],
                            resources: [
                                cdk.Fn.sub(`\${${deploymentRoleLogicalId}.Arn}`),
                                cdk.Fn.sub(`\${${manualRoleLogicalId}.Arn}`),
                            ]
                        })
                    ]
                })
            }
        });

        const artifacts = new ArtifactBucket(this, "ArtifactBucket", { role, stages });

        this.deploymentFunction = new DeploymentFunction(this, "DeploymentFunction", { eventBusName, role, stages });
        this.resultFunction = new ResultFunction(this, "ResultFunction", { accounts: stages });

        const depStages: cp.CfnPipeline.StageDeclarationProperty[] = 
            stages.map((stage, idx) => ({
                name: cdk.Fn.sub(`Deploy-To-${stage.name}`),
                actions: [
                    this.createActionDeclaration(stage.name, stage.id),
                    ...(idx == stages.length - 1 ? 
                        [] : [
                            cdk.Fn.conditionIf(gates.logicalId, cdk.Aws.NO_VALUE, this.manualGate())
                        ]
                    )
                ]
            }));

        const pl = new cp.CfnPipeline(this, "Resource", {
            roleArn: role.roleArn,
            artifactStore: {
                type: "S3",
                location: artifacts.bucketName,
                encryptionKey: { type: "KMS", id: artifacts.keyArn }
            },
            stages: [ ...depStages ]
        });
    }

    private createActionDeclaration(name: string, id: string): cp.CfnPipeline.ActionDeclarationProperty {
        return {
            name: cdk.Fn.sub(`Deploy-To-\${${name}}`),
            configuration: {
                FunctionName: this.deploymentFunction.functionName,
                UserParameters: JSON.stringify({ 
                    name,
                    id,
                    callback: this.resultFunction.functionArn
                })
            },
            actionTypeId: {
                category: "Invoke",
                owner: "AWS",
                provider: "Lambda",
                version: "1"
            },
            inputArtifacts: [{ name: "Source" }],
            roleArn: this.deploymentRole.roleArn
        };
    }

    private manualGate(): cp.CfnPipeline.ActionDeclarationProperty {
        return {
            name: "Manual-Gate",
            actionTypeId: {
                category: "Approval",
                owner: "AWS",
                provider: "Manual",
                version: "1"
              },
              roleArn: this.manualRole.roleArn
        }
    }
}
