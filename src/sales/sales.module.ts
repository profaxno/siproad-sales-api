import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductType } from './entities';
import { ProductTypeController } from './product-type.controller';
import { ProductTypeService } from './product-type.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, Product, ProductType], 'salesConn'),
  ],
  controllers: [CompanyController, ProductController, ProductTypeController],
  providers: [CompanyService, ProductService, ProductTypeService],
  exports: []
})
export class SalesModule {}
