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

import { ProductCategoryController } from './product-category.controller';
import { ProductCategoryService } from './product-category.service';

import { Company, User, Order, OrderProduct, Product, ProductCategory } from './entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, Order, OrderProduct, Product, ProductCategory], 'salesConn'),
  ],
  controllers: [CompanyController, UserController, OrderController, ProductController, ProductCategoryController],
  providers: [CompanyService, UserService, OrderService, ProductService, ProductCategoryService],
  exports: [CompanyService, UserService, ProductService, ProductCategoryService]
})
export class SalesModule {}
