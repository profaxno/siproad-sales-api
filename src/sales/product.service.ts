import { In, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { ProductDto } from './dto/product.dto';
import { Product, Company, ProductType } from './entities';

import { CompanyService } from './company.service';
import { ProductTypeService } from './product-type.service';

import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';

@Injectable()
export class ProductService {

  private readonly logger = new Logger(ProductService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectRepository(Product, 'salesConn')
    private readonly productRepository: Repository<Product>,

    private readonly companyService: CompanyService,
    private readonly productTypeService: ProductTypeService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  async updateBatch(dtoList: ProductDto[]): Promise<ProcessSummaryDto>{
    this.logger.warn(`updateBatch: starting process... listSize=${dtoList.length}`);
    const start = performance.now();
    
    let processResultDto: ProcessSummaryDto = new ProcessSummaryDto(dtoList.length);
    let i = 0;
    for (const dto of dtoList) {
      
      await this.update(dto)
      .then( () => {
        processResultDto.rowsOK++;
        processResultDto.detailsRowsOK.push(`(${i++}) name=${dto.name}, message=OK`);
      })
      .catch(error => {
        processResultDto.rowsKO++;
        processResultDto.detailsRowsKO.push(`(${i++}) name=${dto.name}, error=${error}`);
      })

    }
    
    const end = performance.now();
    this.logger.log(`updateBatch: executed, runtime=${(end - start) / 1000} seconds`);
    return processResultDto;
  }

  update(dto: ProductDto): Promise<ProductDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find product
    const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    return this.findByParams({}, inputDto)
    .then( (entityList: Product[]) => {

      // * validate
      if(entityList.length == 0){
        this.logger.warn(`product not found, id=${dto.id}`);
        return this.create(dto);
      }

      // * update
      const entity = entityList[0];

      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: Product) => this.save(entity) ) // * update
      .then( (entity: Product) => {
        dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.price, entity.id, entity.productType?.id, entity.description, entity.imagenUrl);
        
        const end = performance.now();
        this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
        return dto;
      
      })
      
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`update: error`, error);
      throw error;
    })

  }

  create(dto: ProductDto): Promise<ProductDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find product
    const inputDto: SearchInputDto = new SearchInputDto(undefined, [dto.name]);
    
    return this.findByParams({}, inputDto, dto.companyId)
    .then( (entityList: Product[]) => {

      // * validate
      if(entityList.length > 0){
        const msg = `product already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      // * create
      const entity = new Product();
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: Product) => this.save(entity) ) // * create
      .then( (entity: Product) => {
        dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.price, entity.id, entity.productType?.id, entity.description, entity.imagenUrl);

        const end = performance.now();
        this.logger.log(`create: created OK, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`create: error`, error);
      throw error;
    })
    
  }

  find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<ProductDto[]> {
    const start = performance.now();

    return this.findByParams(paginationDto, inputDto, companyId)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.cost, entity.price, entity.id, entity.productType?.id, entity.description, entity.imagenUrl) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `products not found`;
        this.logger.warn(`find: ${msg}`);
        throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`find: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`find: error`, error);
      throw error;
    })
 
  }

  findOneById(id: string, companyId?: string): Promise<ProductDto[]> {
    const start = performance.now();

    const inputDto: SearchInputDto = new SearchInputDto(id);

    return this.findByParams({}, inputDto, companyId)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.cost, entity.price, entity.id, entity.productType?.id, entity.description, entity.imagenUrl) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `product not found, id=${id}`;
        this.logger.warn(`findOneById: ${msg}`);
        throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`findOneById: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`findOneById: error`, error);
      throw error;
    })
    
  }

  findByCategory(companyId: string, categoryId: string, paginationDto: SearchPaginationDto): Promise<ProductDto[]> {
    const start = performance.now();

    return this.findProductsByCategory(paginationDto, companyId, categoryId)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.cost, entity.price, entity.id, entity.productType?.id, entity.description, entity.imagenUrl) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `products not found, categoryId=${categoryId}`;
        this.logger.warn(`findByCategory: ${msg}`);
        throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`findByCategory: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`findByCategory: error`, error);
      throw error;
    })
    
  }

  remove(id: string): Promise<string> {
    this.logger.warn(`remove: starting process... id=${id}`);
    const start = performance.now();

    // * find product
    const inputDto: SearchInputDto = new SearchInputDto(id);
    
    return this.findByParams({}, inputDto)
    .then( (entityList: Product[]) => {
  
      // * validate
      if(entityList.length == 0){
        const msg = `product not found, id=${id}`;
        this.logger.warn(`remove: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      // * delete: update field active
      const entity = entityList[0];
      entity.active = false;

      return this.save(entity)
      .then( (entity: Product) => {

        const end = performance.now();
        this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
        return 'deleted';
        
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      if(error.errno == 1217) {
        const msg = 'product is being used';
        this.logger.warn(`remove: not executed (${msg})`, error);
        throw new IsBeingUsedException(msg);
      }

      this.logger.error('remove: error', error);
      throw error;
    })

  }

  findByParams(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<Product[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    // * search by id or partial value
    const value = inputDto.search;
    if(value) {
      const whereById     = { id: value, active: true };
      const whereByValue  = { company: { id: companyId }, name: value, active: true };
      const where = isUUID(value) ? whereById : whereByValue;

      return this.productRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: where
      })
    }

    // * search by value list
    if(inputDto.searchList?.length > 0) {
      return this.productRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: {
          company: { 
            id: companyId 
          },
          name: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value}%'`).join(' OR ') ),
          // name: In(inputDto.searchList),
          active: true
        }
      })
    }

    // * search by id list
    if(inputDto.idList?.length > 0) {
      return this.productRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: {
          id: In(inputDto.idList),
          active: true
        }
      })
    }

    // * search all
    return this.productRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: { 
        company: { 
          id: companyId 
        },
        active: true 
      }
    })
    
  }

  private prepareEntity(entity: Product, dto: ProductDto): Promise<Product> {

    // * find company
    const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);
    
    return this.companyService.findByParams({}, inputDto)
    .then( (companyList: Company[]) => {

      if(companyList.length == 0){
        const msg = `company not found, id=${dto.companyId}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new NotFoundException(msg);
      }

      // * find product type
      const inputDto: SearchInputDto = new SearchInputDto(dto.productTypeId);

      return ( dto.productTypeId ? this.productTypeService.findByParams({}, inputDto, dto.companyId) : Promise.resolve([]) )
      .then( (productTypeList: ProductType[]) => {
        
        // * prepare entity
        entity.id           = dto.id ? dto.id : undefined;
        entity.company      = companyList[0];
        entity.name         = dto.name.toUpperCase();
        entity.description  = dto.description?.toUpperCase();
        entity.cost         = dto.cost;
        entity.price        = dto.price;
        entity.productType  = productTypeList.length > 0 ? productTypeList[0] : undefined;

        return entity;

      })
      
    })
    
  }

  private save(entity: Product): Promise<Product> {
    const start = performance.now();

    const newEntity: Product = this.productRepository.create(entity);

    return this.productRepository.save(newEntity)
    .then( (entity: Product) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private findProductsByCategory(paginationDto: SearchPaginationDto, companyId: string, categoryId: string): Promise<Product[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;
    
    return this.productRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        company: { 
          id: companyId 
        },
        productType: {
          id: categoryId
        },
        active: true,
      }
    })
    
  }

}
