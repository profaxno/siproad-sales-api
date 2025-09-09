import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyController } from './companies/company.controller';
import { Company } from './companies/entities/company.entity';
import { CompanyService } from './companies/company.service';

import { UserController } from './users/user.controller';
import { User } from './users/entities/user.entity';
import { UserService } from './users/user.service';

import { OrderController } from './orders/order.controller';
import { Order, OrderProduct } from './orders/entities';
import { OrderService } from './orders/order.service';

import { DataReplicationModule } from 'src/data-transfer/data-replication/data-replication.module';
import { SaleSequence } from './orders/entities/sales-sequence.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, Order, OrderProduct, SaleSequence], 'salesConn'),
    DataReplicationModule
  ],
  controllers: [CompanyController, UserController, OrderController],
  providers: [CompanyService, UserService, OrderService],
  exports: [CompanyService, UserService]
})
export class SalesModule {}
