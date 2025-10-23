import * as lib from 'synapse:lib'
import * as aws from 'terraform-provider:aws'
import { Lambda } from '@aws-sdk/client-lambda'

class LambdaFunction {
    public constructor(
        public readonly functionName: string, 
        target: (event: any) => Promise<any>
    ) {
        const role = new aws.IamRole({
            assumeRolePolicy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{ Effect: "Allow", Action: "sts:AssumeRole", Principal: { Service: 'lambda.amazonaws.com' } }]
            }),
            managedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
        })

        const handler = new lib.Bundle(target)
        const zipped = new lib.Archive(handler)

        const fn = new aws.LambdaFunction({
            functionName,
            filename: zipped.filePath,
            sourceCodeHash: zipped.sourceHash,
            handler: `handler.default`,
            runtime: 'nodejs20.x',
            role: role.arn,
        })
    }
}

const myFn = new LambdaFunction('my-lambda-fn', async ev => `your event is: ${JSON.stringify(ev)}`)

export async function main() {
    const client = new Lambda()
    const resp = await client.invoke({
        FunctionName: myFn.functionName,
        Payload: Buffer.from(JSON.stringify({ hello: 'world!' })),
    })
    console.log('raw response:', resp)
    console.log('decoded:', Buffer.from(resp.Payload!).toString())
}