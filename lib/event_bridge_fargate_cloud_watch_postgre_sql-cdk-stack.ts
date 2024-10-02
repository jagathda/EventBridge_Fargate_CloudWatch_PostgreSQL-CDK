import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';

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

    // Define IAM role for ECS task execution
    const ecsTaskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Security Group for the Fargate task
    const fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateSecurityGroup', {
      vpc,
      description: 'Allow traffic from Fargate tasks to RDS',
      allowAllOutbound: true,
    });

    // Security Group for the RDS PostgreSQL instance
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Allow Fargate tasks to access PostgreSQL RDS',
      allowAllOutbound: true,
    });

    // RDS PostgreSQL instance
    const dbInstance = new rds.DatabaseInstance(this, 'PostgreSQLInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13,
      }),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [dbSecurityGroup],
      allocatedStorage: 20,
      maxAllocatedStorage: 20,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      multiAz: false,
      databaseName: 'mydatabase',
      credentials: rds.Credentials.fromGeneratedSecret('dbadmin'), // Secrets Manager for credentials
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: false,
    });

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: ecsTaskExecutionRole, // Role for ECS task execution
    });

    // Define the container for the ECS task
    const container = taskDefinition.addContainer('MyContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'MyAppLogs',
        logGroup: new logs.LogGroup(this, 'LogGroup', {
          logGroupName: '/ecs/MyApp',
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Add environment variables for PostgreSQL connection to the container
    container.addEnvironment('PG_HOST', dbInstance.instanceEndpoint.hostname);
    container.addEnvironment('PG_USER', 'dbadmin');
    container.addEnvironment('PG_DB', 'mydatabase');
    container.addEnvironment('PG_PORT', '5432');

    // Set the database password from Secrets Manager
    const dbSecret = dbInstance.secret;
    if (dbSecret) {
      container.addSecret('PG_PASSWORD', ecs.Secret.fromSecretsManager(dbSecret, 'password')); // Retrieve only 'password' field
    }

    // Add ingress rule to allow Fargate tasks to connect to PostgreSQL RDS
    dbSecurityGroup.addIngressRule(
      fargateSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Fargate tasks',
    );

    // EventBridge rule to trigger the ECS task
    const rule = new events.Rule(this, 'MyEventRule', {
      eventPattern: {
        source: ['custom.my-application'], // Events with this source will trigger the ECS task
      },
    });

  }
}
