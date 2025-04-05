import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DataReceptionService } from './data-reception.service';
import { DataReceptionWorkerService } from './data-reception-redis-worker.service';
import { SalesModule } from 'src/sales/sales.module';

@Module({
  controllers: [],
  providers: [DataReceptionService, DataReceptionWorkerService],
  imports: [ConfigModule, SalesModule]
})
export class DataReceptionModule {}
