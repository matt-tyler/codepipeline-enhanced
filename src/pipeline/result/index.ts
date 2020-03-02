import { Handler} from "aws-lambda";
import { CodePipeline } from "aws-sdk";

interface Event {
    reason: "Success" | "Failure"
    jobId: string
    message?: string
}

export const handler: Handler<Event> = async ({ jobId, reason, message }) => {
    
    const cp = new CodePipeline();

    if (reason == "Success") {
        await cp.putJobSuccessResult({ jobId }).promise();
    }
    else {
        await cp.putJobFailureResult({ jobId, failureDetails: {
            type: "JobFailed",
            message: message!,
        }}).promise();
    }
}