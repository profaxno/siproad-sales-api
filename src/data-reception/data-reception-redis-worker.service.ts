import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';  // Import Redis from ioredis
import { MessageDto } from './dto/message.dto';
import { ProductDto } from 'src/sales/dto';
import { ProductService } from '../sales/product.service';
import { ProcessEnum } from './enums';

@Injectable()
export class DataReplicationWorkerService implements OnModuleInit {

  private readonly logger = new Logger(DataReplicationWorkerService.name);
  
  private readonly redisHost: string = "";
  private readonly redisPort: number = 0;
  private readonly redisPassword: string = "";
  private readonly redisFamily: number = 0;

  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly productService: ProductService
  ) {
    // * Retrieve the Redis configuration values from ConfigService
    this.redisHost = this.configService.get('redisHost');
    this.redisPort = this.configService.get('redisPort');
    this.redisPassword = this.configService.get('redisPassword');
    this.redisFamily = this.configService.get('redisFamily');
  }

  // * Implementing OnModuleInit to initialize the worker when the module is loaded
  async onModuleInit() {
    
    // * Create the Redis client using ioredis
    const redisClient = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      family: this.redisFamily,
      maxRetriesPerRequest: null
    });

    // * Create a BullMQ Worker to listen to the 'jobQueue' queue
    this.worker = new Worker('jobQueue', async job => {
      const start = performance.now();
      this.logger.log(`worker: starting process... jobId=${job.id}, data: ${JSON.stringify(job.data)}`);

      return this.processJob(job.data)
      .then( (response: string) => {
        const end = performance.now();
        this.logger.log(`worker: executed, runtime=${(end - start) / 1000} seconds, jobId=${job.id} response=${response}`);
        return true;
        
      })
      .catch( (error: Error) => {
        this.logger.error(error.stack);
        throw error;
      })

      // try {
      //   // Process the job (in this example, just log it)
      //   this.logger.warn(`worker: processing jobId=${job.id}, data: ${JSON.stringify(job.data)}`);
                
      //   // Simulate processing (replace with your actual job logic)
      //   await this.processJob(job.data);
        
      //   const end = performance.now();
      //   this.logger.log(`worker: executed, runtime=${(end - start) / 1000} seconds, jobId=${job.id}`);

      //   return true;  // Indicate that the job was successfully processed

      // } catch (error) {
      //   this.logger.error(`worker: Error processing jobId=${job.id}, error=${JSON.stringify(error)}`);
      //   throw error;  // Rethrow error to indicate failure
      // }

    }, {
      connection: redisClient,  // Pass the Redis client connection here
    });

    this.logger.log('Worker initialized and listening for jobs...');
  }

  // Method to simulate job processing (replace with your actual logic)
  private processJob(messageDto: MessageDto): Promise<string> {
    //this.logger.log(`processJob: messageDto=${JSON.stringify(messageDto)}`);
    
    const dto: ProductDto = JSON.parse(messageDto.jsonData);
    
    switch (messageDto.process) {

      case ProcessEnum.PRODUCT_UPDATE:
        return this.productService.update(dto)
        .then( () => 'update executed' )

      case ProcessEnum.PRODUCT_UPDATE:
        return this.productService.update(dto)
        .then( () => 'delete executed' )

      default:
        throw new Error(`process not implement, process=${messageDto.process}`);

    }

    // // Simulate a delay for processing the job
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     this.logger.log(`Job data processed: ${JSON.stringify(data)}`);
    //     resolve();
    //   }, 2000);  // Simulated processing delay (2 seconds)
    // });
  }

}
