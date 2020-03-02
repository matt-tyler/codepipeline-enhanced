import { Handler } from "aws-lambda";

interface CodePipelineLambdaEvent {
    "Codepipeline.job": {
        id: string
        data: {
            actionConfiguration: {
                configuration: {
                    FunctionName: string
                    UserParameters: string
                }
            },
            inputArtifacts: {
                location: {
                    s3Location: {
                        bucketName: string
                        objectKey: string
                    }
                    type: "S3"
                }
                revision: string | null
                name: string
            }[],
            outputArtifacts: {}[]
            artifactCredentials: {
                secretAccessKey: string
                sessionToken: string
                accessKeyId: string
            },
            continuationToken: string
            encryptionKey: {
                type: "KMS"
                id: string
            }
        }
    }
}

interface UserParameters {
    accountId: string
    stage: string
    callback: string
}

export const handler: Handler<CodePipelineLambdaEvent> = async ({
    "Codepipeline.job": {
        id: jobId, data: { inputArtifacts, actionConfiguration: { configuration: { UserParameters } } }
    }
}) => {
    const parameters = JSON.parse(UserParameters) as UserParameters;
    const { location: { s3Location: { bucketName, objectKey } } } = inputArtifacts[0]
    return { action: "Deploy", jobId, bucketName, objectKey, ...parameters };
}