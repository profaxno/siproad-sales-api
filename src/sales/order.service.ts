import { Brackets, In, InsertResult, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
// import { nanoid } from 'nanoid'
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';
const generateCode = require('../../nanoid-wrapper.cjs'); 
import * as moment from 'moment-timezone';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { OrderDto, OrderProductDto } from './dto/order.dto';
import { OrderSearchInputDto } from './dto/order-search.dto';
import { Order, OrderProduct, Product, Company, User } from './entities';

import { CompanyService } from './company.service';

import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';
import { UserService } from './user.service';
import { ProductService } from './product.service';
import { DateEnum } from 'src/common/enums/date.enum';

@Injectable()
export class OrderService {

  private readonly logger = new Logger(OrderService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectRepository(Order, 'salesConn')
    private readonly orderRepository: Repository<Order>,
    
    @InjectRepository(OrderProduct, 'salesConn')
    private readonly orderProductRepository: Repository<OrderProduct>,

    // @InjectRepository(Product, 'salesConn')
    // private readonly productRepository: Repository<Product>,

    private readonly companyService: CompanyService,
    private readonly productService: ProductService,
    private readonly userService: UserService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  // async updateBatch(dtoList: OrderDto[]): Promise<ProcessSummaryDto>{
  //   this.logger.warn(`updateBatch: starting process... listSize=${dtoList.length}`);
  //   const start = performance.now();
    
  //   let processSummaryDto: ProcessSummaryDto = new ProcessSummaryDto(dtoList.length);
  //   let i = 0;
  //   for (const dto of dtoList) {
      
  //     await this.update(dto)
  //     .then( () => {
  //       processSummaryDto.rowsOK++;
  //       processSummaryDto.detailsRowsOK.push(`(${i++}) name=${dto.name}, message=OK`);
  //     })
  //     .catch(error => {
  //       processSummaryDto.rowsKO++;
  //       processSummaryDto.detailsRowsKO.push(`(${i++}) name=${dto.name}, error=${error}`);
  //     })

  //   }
    
  //   const end = performance.now();
  //   this.logger.log(`updateBatch: executed, runtime=${(end - start) / 1000} seconds`);
  //   return processSummaryDto;
  // }

  update(dto: OrderDto): Promise<OrderDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find order
    const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    return this.findByParams({}, inputDto)
    .then( (entityList: Order[]) => {

      // * validate
      if(entityList.length == 0){
        const msg = `order not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg})`);
        throw new NotFoundException(msg);
      }

      // * update
      const entity = entityList[0];
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: Order) => this.save(entity) ) // * update
      .then( (entity: Order) => {
        
        return this.updateOrderProduct(entity, dto.productList) // * create orderProduct
        .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) ) // * generate order with orderProduct
        .then( (dto: OrderDto) => {
          
          const end = performance.now();
          this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
          return dto;
        })

      })
      
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`update: error=${error.message}`);
      throw error;
    })

  }

  create(dto: OrderDto): Promise<OrderDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * create
    const entity = new Order();
    
    return this.prepareEntity(entity, dto) // * prepare
    .then( (entity: Order) => this.save(entity) ) // * update
    .then( (entity: Order) => {

      return this.updateOrderProduct(entity, dto.productList) // * create orderProduct
      .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) ) // * generate order with orderProduct
      .then( (dto: OrderDto) => {

        const end = performance.now();
        this.logger.log(`create: created OK, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`create: error=${error.message}`);
      throw error;
    })
    
  }

  // find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<OrderDto[]> {
  //   const start = performance.now();

  //   return this.findByParams(paginationDto, inputDto, companyId)
  //   .then( (entityList: Order[]) => entityList.map( (entity) => this.generateOrderWithProductList(entity, entity.orderProduct) ) )
  //   .then( (dtoList: OrderDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `orders not found`;
  //       this.logger.warn(`find: ${msg}`);
  //       return [];
  //       // throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`find: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     this.logger.error(`find: error`, error);
  //     throw error;
  //   })
 
  // }

  findOneById(id: string, companyId?: string): Promise<OrderDto[]> {
    const start = performance.now();
    const inputDto: SearchInputDto = new SearchInputDto(id);
        
    // * find product
    return this.findByParams({}, inputDto, companyId)
    .then( (entityList: Order[]) => entityList.map( (entity) => this.generateOrderWithProductList(entity, entity.orderProduct) ) )
    .then( (dtoList: OrderDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `order not found, id=${id}`;
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

  searchByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: OrderSearchInputDto): Promise<OrderDto[]> {
    const start = performance.now();

    return this.searchEntitiesByValues(companyId, paginationDto, inputDto)
    .then( (entityList: Order[]) => entityList.map( (entity) => this.generateOrderWithProductList(entity, entity.orderProduct) ) )
    .then( (dtoList: OrderDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `orders not found, inputDto=${JSON.stringify(inputDto)}`;
        this.logger.warn(`searchByValues: ${msg}`);
        throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`searchByValues: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`searchByValues: error`, error);
      throw error;
    })
    
  }

  remove(id: string): Promise<string> {
    this.logger.log(`remove: starting process... id=${id}`);
    const start = performance.now();

    // * find order
    const inputDto: SearchInputDto = new SearchInputDto(id);
    
    return this.findByParams({}, inputDto)
    .then( (entityList: Order[]) => {
  
      // * validate
      if(entityList.length == 0){
        const msg = `order not found, id=${id}`;
        this.logger.warn(`remove: not executed (${msg})`);
        throw new NotFoundException(msg);
      }

      // * delete: update field active
      const entity = entityList[0];
      entity.active = false;

      return this.save(entity)
      .then( () => {
        const end = performance.now();
        this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
        return 'deleted';

      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      if(error.errno == 1217) {
        const msg = 'order is being used';
        this.logger.warn(`removeProduct: not executed (${msg})`, error);
        throw new IsBeingUsedException(msg);
      }

      this.logger.error('remove: error', error);
      throw error;
    })

  }

  private prepareEntity(entity: Order, dto: OrderDto): Promise<Order> {
  
    // * find company
    const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);
    
    return this.companyService.findByParams({}, inputDto)
    .then( (companyList: Company[]) => {

      if(companyList.length == 0){
        const msg = `company not found, id=${dto.companyId}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new NotFoundException(msg);
      }

      // * find user
      const inputDto: SearchInputDto = new SearchInputDto(dto.userId);

      return this.userService.findByParams({}, inputDto)
      .then( (userList: User[]) => {
    
        if(userList.length == 0){
          const msg = `user not found, id=${dto.companyId}`;
          this.logger.warn(`create: not executed (${msg})`);
          throw new NotFoundException(msg);
        }

        return ( dto.code ? Promise.resolve(dto.code) : this.generateCode(dto.companyId) )// * generate code
        .then( (code: string) => {
          
          // * prepare entity
          entity.code           = code.toUpperCase();
          entity.company        = companyList[0];
          entity.user           = userList[0];
          entity.customerIdDoc  = dto.customerIdDoc?.toUpperCase();
          entity.customerName   = dto.customerName?.toUpperCase();
          entity.customerEmail  = dto.customerEmail?.toUpperCase();
          entity.customerPhone  = dto.customerPhone;
          entity.customerAddress = dto.customerAddress?.toUpperCase();
          entity.comment        = dto.comment;
          entity.discount       = dto.discount;
          entity.discountPct    = dto.discountPct;
          entity.status         = dto.status;
          
          return entity;
        })

      })
      
    })
    
  }

  private findByParams(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<Order[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    // * search by id or partial value
    const value = inputDto.search;
    if(value) {
      const whereById     = { id: value, active: true };
      const whereByValue  = { company: { id: companyId }, comment: Like(`%${value}%`), active: true };
      const where = isUUID(value) ? whereById : whereByValue;

      return this.orderRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: where,
        relations: {
          orderProduct: true
        },
        order: { createdAt: "DESC" }
      })
    }

    // * search by value list
    if(inputDto.searchList?.length > 0){
      return this.orderRepository.find({
        take: limit,
        skip: (page - 1) * limit,
        where: {
          company: { 
            id: companyId
          },
          comment: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
          // comment: In(inputDto.searchList),
          active: true
        },
        relations: {
          orderProduct: true
        },
        order: { createdAt: "DESC" }
      })
    }

    // * search all
    return this.orderRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: { 
        company: { 
          id: companyId 
        },
        active: true 
      },
      relations: {
        orderProduct: true
      },
      order: { createdAt: "DESC" }
    })
    
  }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: OrderSearchInputDto): Promise<Order[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.orderRepository.createQueryBuilder('a')
    .leftJoinAndSelect('a.company', 'company')
    .leftJoinAndSelect('a.orderProduct', 'orderProduct')
    .leftJoinAndSelect('orderProduct.product', 'product')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.active = :active', { active: true });

    if(inputDto.createdAtInit) {
      const createdAtInit = moment.tz(inputDto.createdAtInit, DateEnum.TIME_ZONE).utc().format(DateEnum.DATETIME_FORMAT)
      query.andWhere('a.createdAt >= :createdAtInit', { createdAtInit: createdAtInit });
    }

    if(inputDto.createdAtEnd) {
      const createdAtEnd = moment.tz(inputDto.createdAtEnd, DateEnum.TIME_ZONE).utc().format(DateEnum.DATETIME_FORMAT)
      query.andWhere('a.createdAt <= :createdAtEnd', { createdAtEnd: createdAtEnd });
    }

    if(inputDto.code) {
      const formatted = `%${inputDto.code?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere('a.code LIKE :code', { code: formatted });
    }

    if(inputDto.customerNameIdDoc) {
      const formatted = `%${inputDto.customerNameIdDoc?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere(
        new Brackets(qb => {
          qb.where('a.customerName LIKE :customerName').orWhere('a.customerIdDoc LIKE :customerIdDoc');
        }),
        {
          customerName: formatted,
          customerIdDoc: formatted,
        }
      );

      // const formatted = `%${inputDto.customerNameIdDoc.replace(' ', '%')}%`;
      // query.andWhere('a.customerName LIKE :customerName OR a.customerIdDoc LIKE :customerIdDoc', { customerName: formatted, customerIdDoc: formatted });
    }

    if(inputDto.comment) {
      const formatted = `%${inputDto.comment?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere('a.comment LIKE :comment', { comment: formatted });
    }

    return query
    .skip((page - 1) * limit)
    .take(limit)
    .orderBy("a.createdAt", "DESC")
    .getMany();
  }

  private save(entity: Order): Promise<Order> {
    const start = performance.now();

    const newEntity: Order = this.orderRepository.create(entity);

    return this.orderRepository.save(newEntity)
    .then( (entity: Order) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private updateOrderProduct(order: Order, orderProductDtoList: OrderProductDto[] = []): Promise<OrderProduct[]> {
    this.logger.log(`updateOrderProduct: starting process... order=${JSON.stringify(order)}, orderProductDtoList=${JSON.stringify(orderProductDtoList)}`);
    const start = performance.now();

    if(orderProductDtoList.length == 0){
      this.logger.warn(`updateOrderProduct: not executed (order product list empty)`);
      return Promise.resolve([]);
    }

    // * find products by id
    const productIdList = orderProductDtoList.map( (item) => item.id );
    const uniqueProductIdList: string[] = [...new Set(productIdList)]; // * remove duplicates

    const inputDto: SearchInputDto = new SearchInputDto(undefined, undefined, uniqueProductIdList);

    return this.productService.findByParams({}, inputDto)
    .then( (productList: Product[]) => {

      // * validate
      if(productList.length !== uniqueProductIdList.length){
        const productIdNotFoundList: string[] = uniqueProductIdList.filter( (id) => !productList.find( (product) => product.id == id) );
        const msg = `products not found, IdList=(${uniqueProductIdList.length})${JSON.stringify(uniqueProductIdList)}, IdNotFoundList=(${productIdNotFoundList.length})${JSON.stringify(productIdNotFoundList)}`;
        throw new NotFoundException(msg); 
      }

      // * generate order product list
      return orderProductDtoList.map( (orderProductDto: OrderProductDto) => {
        
        const product = productList.find( (value) => value.id == orderProductDto.id);

        const orderProduct = new OrderProduct();
        orderProduct.order    = order;
        orderProduct.product  = product;
        orderProduct.qty      = orderProductDto.qty;
        orderProduct.comment  = orderProductDto.comment;
        orderProduct.name     = product.name;
        orderProduct.code     = product.code;
        orderProduct.cost     = orderProductDto.cost;
        orderProduct.price    = orderProductDto.price;
        orderProduct.discount = orderProductDto.discount;
        orderProduct.discountPct = orderProductDto.discountPct;
        orderProduct.status   = orderProductDto.status;
        
        return orderProduct;
      })

    })
    .then( (orderProductListToInsert: OrderProduct[]) => {

      return this.orderProductRepository.findBy( { order } ) // * find order products to remove
      .then( (orderProductListToDelete: OrderProduct[]) => this.orderProductRepository.remove(orderProductListToDelete) ) // * remove order products
      .then( () => this.bulkInsertOrderProducts(orderProductListToInsert) ) // * insert order products
      .then( (orderProductList: OrderProduct[]) => {
        const end = performance.now();
        this.logger.log(`updateOrderProduct: OK, runtime=${(end - start) / 1000} seconds`);
        return orderProductList;
      })

    })
    .catch(error => {
      this.logger.error(`updateOrderProduct: error=${error.message}`);
      throw error;
    })

  }

  private bulkInsertOrderProducts(orderProductList: OrderProduct[]): Promise<OrderProduct[]> {
    const start = performance.now();
    this.logger.log(`bulkInsertOrderProducts: starting process... listSize=${orderProductList.length}`);

    const newOrderProductList: OrderProduct[] = orderProductList.map( (value) => this.orderProductRepository.create(value));
    
    try {
      return this.orderProductRepository.manager.transaction( async(transactionalEntityManager) => {
        
        return transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(OrderProduct)
          .values(newOrderProductList)
          .execute()
          .then( (insertResult: InsertResult) => {
            const end = performance.now();
            this.logger.log(`bulkInsertOrderProducts: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
            return newOrderProductList;
          })
      })

    } catch (error) {
      this.logger.error(`bulkInsertOrderProducts: error=${error.message}`);
      throw error;
    }
  }

  generateOrderWithProductList(order: Order, orderProductList: OrderProduct[]): OrderDto {
    
    let orderProductDtoList: OrderProductDto[] = [];
    let cost  = 0;
    let price = 0;

    if(orderProductList.length > 0){
      orderProductDtoList = orderProductList.map( (orderProduct: OrderProduct) => new OrderProductDto(orderProduct.product.id, orderProduct.qty, orderProduct.name, orderProduct.cost, orderProduct.price, orderProduct.comment, orderProduct.code, orderProduct.discount, orderProduct.discountPct, orderProduct.status) );

      // * calculate cost, price
      cost  = orderProductDtoList.reduce( (acc, dto) => acc + (dto.qty * dto.cost), 0);
      price = orderProductDtoList.reduce( (acc, dto) => acc + (dto.qty * dto.price), 0);
    }

    // const a = moment.tz(order.createdAt, "America/Santiago").format(DateEnum.DATETIME_FORMAT);
    // const a2 = order.createdAt; // esto ya tiene GMT-4
    // const a3 = moment(order.createdAt).format();
    // const a4 = moment(order.createdAt).tz("America/Santiago").format();
    // const a5 = moment.utc(order.createdAt).tz("America/Santiago").format();

    // const fechaUTC = '2025-04-15 03:11:17';
    // const fechaChile = moment.utc(fechaUTC).tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');

    // * format createdAt
    let createdAtFormat = moment(order.createdAt).format(DateEnum.DATETIME_FORMAT);
    createdAtFormat     = moment.utc(createdAtFormat).tz(DateEnum.TIME_ZONE).format(DateEnum.DATETIME_FORMAT);

    // * generate order dto
    const orderDto = new OrderDto(
      order.company.id,
      order.id,
      order.code,
      order.customerIdDoc,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.customerAddress,
      order.comment,
      order.discount,
      order.discountPct,
      order.status,
      createdAtFormat,
      order.company,
      order.user,
      orderProductDtoList,
      cost,
      price);

    return orderDto;
  }

  private async generateCode(companyId: string): Promise<string> {

    const code = await generateCode();

    return this.findByCode(companyId, code)
    .then( (orderList: Order[]) => {

      if(orderList.length == 0)
        return code;

      return this.generateCode(companyId);
    })

  }

  private findByCode(companyId: string, code: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: {
        company: { 
          id: companyId 
        },
        code: code,
        active: true 
      }
    })
  }

}
