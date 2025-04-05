import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DataReceptionService } from './data-reception.service';
import { DataReplicationWorkerService } from './data-reception-redis-worker.service';
import { SalesModule } from 'src/sales/sales.module';

@Module({
  controllers: [],
  providers: [DataReceptionService, DataReplicationWorkerService],
  imports: [ConfigModule, SalesModule]
})
export class DataReceptionModule {}
