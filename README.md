# Simple Deployment to AWS Lambda

Deploy + invoke AWS Lambda. 42 lines, [1 file](/lambda.ts), 1 tool. No frameworks.

## Prerequisites
* [Synapse](https://github.com/Cohesible/synapse#installation)
    * macOS/Linux `curl -fsSL https://synap.sh/install | bash`
    * Windows `irm https://synap.sh/install.ps1 | iex`

* AWS credentials in ~/.aws/credentials or env vars

## Usage

```
synapse compile
synapse deploy
synapse run
```

All code is in [lambda.ts](/lambda.ts), `package.json` optional.

Commands will show "target: local", that's just the standard library target, unused here. We're using the AWS Terraform provider directly, no funny business. 

You can see some of the deployed resources with `synapse show myFn`. 
> The output is messy, but useful for working with the materialized resources in the AWS console or any other tooling.

Clean-up everything using `synapse destroy`

## Under the hood

### `compile`

Evaluates the code aka "comptime". Resources (including `Bundle`) can be used in comptime but their true state is abstract as they do not exist yet.

Any modules that create resources are themselves resources.

All resource instances are stored in the deployment plan.

### `deploy`

The plan is executed to create everything. 

Subsequent deploy commands update the existing deployment. Deployments are automatically bound to the `git` repo + package + `SYNAPSE_ENV` tuple.

### `run`

We load up the "deployed" `lambda.ts` module and call the `main` function. 

Note that "deployed" in Synapse just means it is derived from executing the plan. Deploying something doesn't have to mean uploading.

### `show`

Synapse is aware of how resources in the plan relate to symbols (names) in your code. 

So running `show myFn` grabs all resources instantiated at that line and shows their current deployment state. 

Eventually, you'll be able to specify resources more precisely e.g. `myFn/role` specifically refers to the `role` instance.

### `lib.Bundle`

Runs `esbuild` (and soon, something even faster) to bundle up the provided closure. 

And yes, it works over individual closures, state and all. You can see this by finding the AWS Lambda function and looking at the code.

On the surface, this is kind of like Pulumi's "magic functions". However, the serialization strategy can handle far more cases.

### `lib.Archive`

A utility resource for zipping stuff up. 

This is the most fragile part of the code because it still defaults to zipping up `Bundle` resources to a single `handler.{cjs,mjs}` file within the zip. This is where the magic `handler.default` string comes from.

It only works this way due to issues with the AWS Terraform provider at one point, but that might no longer apply.

### `terraform-provider:aws`

Points to a generated module containing bindings to work with the Terraform provider.

This module is generated just-in-time. `terraform-provider:*` modules refer to the HashiCorp provider registry by default. 

For example, you could import `terraform-provider:azurerm` without any extra steps. Namespaced providers currently require changing `package.json` although that may change in the future.

### `package.json`

Technically not needed, I added it to pin versions and add types for Node.

### `destroy`

Destroys everything in the deployment. 

This **_does not_** ask you for confirmation unless the deployment is marked for extra safeguards e.g. `SYNAPSE_ENV` contains "prod"

