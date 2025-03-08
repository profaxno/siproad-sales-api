import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

import { UserController } from './user.controller';
import { UserService } from './user.service';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { ProductTypeController } from './product-type.controller';
import { ProductTypeService } from './product-type.service';

import { Company, User, Order, OrderProduct, Product, ProductType } from './entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, Order, OrderProduct, Product, ProductType], 'salesConn'),
  ],
  controllers: [CompanyController, UserController, OrderController, ProductController, ProductTypeController],
  providers: [CompanyService, UserService, OrderService, ProductService, ProductTypeService],
  exports: []
})
export class SalesModule {}
