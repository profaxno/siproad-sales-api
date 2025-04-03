import { In, InsertResult, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
// import { nanoid } from 'nanoid'
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';
const generateCode = require('../../src/utils/nanoid-wrapper.cjs'); 
import * as moment from 'moment-timezone';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { OrderDto, OrderProductDto } from './dto/order.dto';
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

      this.logger.error(`update: error`, error);
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

      this.logger.error(`create: error`, error);
      throw error;
    })
    
  }

  find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<OrderDto[]> {
    const start = performance.now();

    return this.findByParams(paginationDto, inputDto, companyId)
    .then( (entityList: Order[]) => entityList.map( (entity) => this.generateOrderWithProductList(entity, entity.orderProduct) ) )
    .then( (dtoList: OrderDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `orders not found`;
        this.logger.warn(`find: ${msg}`);
        return [];
        // throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`find: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      this.logger.error(`find: error`, error);
      throw error;
    })
 
  }

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
          entity.customerIdDoc  = dto.customerIdDoc;
          entity.customerName   = dto.customerName?.toUpperCase();
          entity.customerEmail  = dto.customerEmail?.toUpperCase();
          entity.customerPhone  = dto.customerPhone;
          entity.customerAddress = dto.customerAddress?.toUpperCase();
          entity.comment        = dto.comment?.toUpperCase();
          entity.discount       = dto.discount;
          entity.discountPct    = dto.discountPct;
          entity.status         = dto.status; // TODO: poner requerido el status aqui y en el graphql
          
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
    const inputDto: SearchInputDto = new SearchInputDto(undefined, undefined, productIdList);

    return this.productService.findByParams({}, inputDto)
    .then( (productList: Product[]) => {

      // * validate
      if(productList.length !== productIdList.length){
        const productIdNotFoundList: string[] = productIdList.filter( (id) => !productList.find( (product) => product.id == id) );
        const msg = `products not found, idList=${JSON.stringify(productIdNotFoundList)}`;
        throw new NotFoundException(msg); 
      }

      // * create orderProduct
      return this.orderProductRepository.findBy( { order } ) // * find orderProduct
      .then( (orderProductList: OrderProduct[]) => this.orderProductRepository.remove(orderProductList)) // * remove orderProducts
      .then( () => {
        
        // * generate order product list
        const orderProductList: OrderProduct[] = productList.map( (product: Product) => {
          const orderProductDto = orderProductDtoList.find( (value) => value.id == product.id);

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
  
        // * bulk insert
        return this.bulkInsertOrderProducts(orderProductList)
        .then( (orderProductList: OrderProduct[]) => {
          const end = performance.now();
          this.logger.log(`updateOrderProduct: OK, runtime=${(end - start) / 1000} seconds`);
          return orderProductList;
        })

      })

    })

  }

  private bulkInsertOrderProducts(orderProductList: OrderProduct[]): Promise<OrderProduct[]> {
    const start = performance.now();
    this.logger.log(`bulkInsertOrderProducts: starting process... listSize=${orderProductList.length}`);

    const newOrderProductList: OrderProduct[] = orderProductList.map( (value) => this.orderProductRepository.create(value));
    
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
      moment(order.createdAt).format(DateEnum.DATETIME_FORMAT),
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
