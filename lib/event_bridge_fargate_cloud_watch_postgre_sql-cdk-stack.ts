import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class EventBridgeFargateCloudWatchPostgreSqlCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for ECS and RDS
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2, // 2 availability zones for high availability
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'MyCluster', {
      vpc: vpc, // Cluster associated with the VPC
    });

    // Define ECR repository for the ECS task's Docker image
    const repository = ecr.Repository.fromRepositoryName(this, 'MyRepo', 'message-logger');

  }
}
