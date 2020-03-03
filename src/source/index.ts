import { Handler } from "aws-lambda";
import { CodePipeline, CodeBuild } from "aws-sdk";
import { GenericError } from "./error";

interface PollForJobsEvent {
    CodePipelineName: string
}

export const pollForJobsHandler: Handler<PollForJobsEvent> = async ({ CodePipelineName }) => {
    try {
        const cp = new CodePipeline();
        const { jobs } = await cp.pollForJobs({
            actionTypeId: {
                category: "Source",
                provider: "Codepipeline-Enhanced",
                version: "1",
                owner: "Custom"
            },
            queryParam: {
                PipelineName: CodePipelineName
            }
        }).promise();

        const job = jobs!.shift();

        await cp.acknowledgeJob({ jobId: job!.id!, nonce: job!.nonce! }).promise();

        const { bucketName, objectKey } = job!.data!.outputArtifacts![0].location!.s3Location!;

        return {
            CodePipelineExecutionId: job!.data!.pipelineContext!.pipelineExecutionId,
            JobId: job!.id,
            S3Location: `s3://${bucketName}/${objectKey}`
        }
    } catch (err) {
        console.log(err);
        throw new GenericError("JobStartFailure", (err as Error).message);
    }
}

interface ExecutePushEvent {
    CodeBuildProjectName: string
    S3Location: string
}

export const executePushHandler: Handler<ExecutePushEvent> = async ({ 
    CodeBuildProjectName: projectName,
    S3Location: sourceLocationOverride
}) => {
    const cb = new CodeBuild();
    const { build } = await cb.startBuild({
        projectName,
        sourceLocationOverride,
        sourceTypeOverride: "S3"
    }).promise();
    return build!.id
}

interface WaitForSuccessEvent {
    CodeBuildProjectName: string
    CodeBuildExecutionId: string
}

export const waitForSuccessHandler: Handler<WaitForSuccessEvent> = async ({
    CodeBuildExecutionId
}) => {
    try {
        const cb = new CodeBuild();
        const { builds }= await cb.batchGetBuilds({
            ids: [ CodeBuildExecutionId ]
        }).promise();
        const build = builds![0];
        return build.buildStatus;
    } catch (err) {
        console.log(err);
        throw new GenericError("JobStatusFailure", (err as Error).message)
    }
}
