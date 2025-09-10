import { Brackets, DataSource, EntityManager, In, InsertResult, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';

import { DateFormatEnum, ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import * as moment from 'moment-timezone';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { Company } from '../companies/entities/company.entity';
import { CompanyService } from '../companies/company.service';

import { User } from '../users/entities/user.entity';
import { UserService } from '../users/user.service';

import { OrderDto, OrderProductDto, OrderSearchInputDto } from './dto';
import { Order, OrderProduct } from './entities';
import { OrderStatusEnum } from './enums/order-status.enum';

import { JsonBasic } from 'src/data-transfer/interface/json-basic.interface';
import { MessageDto } from 'src/data-transfer/dto/message.dto';
import { MovementDto } from 'src/products/dto/movement.dto';
import { MovementReasonEnum, MovementTypeEnum } from 'src/products/enums';
import { ProcessEnum, SourceEnum } from 'src/data-transfer/enums';
import { DataReplicationService } from 'src/data-transfer/data-replication/data-replication.service';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';
import { Sequence } from './entities/sequence.entity';
import { SequenceTypeEnum } from './enums/secuence-type.enum';


@Injectable()
export class OrderService {

  private readonly logger = new Logger(OrderService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectDataSource('salesConn')
    private readonly dataSource: DataSource,

    @InjectRepository(Order, 'salesConn')
    private readonly orderRepository: Repository<Order>,
    
    @InjectRepository(OrderProduct, 'salesConn')
    private readonly orderProductRepository: Repository<OrderProduct>,

    private readonly replicationService: DataReplicationService
    
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

    return this.orderRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: Order) => {
      
      // * validate
      if(!entity) {
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      return this.updateStockMovements(dto) // * update stock movements
      .then( () => {

        // * process with transaction db
        return this.dataSource.transaction( (manager: EntityManager) => {

          // * get repositories
          const orderRepository : Repository<Order> = manager.getRepository(Order);
          const orderProductRepository: Repository<OrderProduct> = manager.getRepository(OrderProduct);

          return this.prepareEntity(entity, dto) // * prepare
          .then( (entity: Order) => this.save(entity, orderRepository) ) // * save
          .then( (entity: Order) => {
            return this.updateOrderProduct(entity, dto.productList, orderProductRepository) 
            .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) )
          })

        })
        .then( (dto: OrderDto) => {
          const end = performance.now();
          this.logger.log(`update: OK, runtime=${(end - start) / 1000} seconds`);
          return dto;
        })
        .catch(error => {
          const dto: OrderDto = this.generateOrderWithProductList(entity, entity.orderProduct);
          this.updateStockMovements(dto); // * rollback stock movements
          throw error;
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

  // update(dto: OrderDto): Promise<OrderDto> {
  //   if(!dto.id)
  //     return this.create(dto); // * create
    
  //   this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
  //   const start = performance.now();

  //   return this.orderRepository.findOne({
  //     where: { id: dto.id },
  //   })
  //   .then( (entity: Order) => {

  //     // * validate
  //     if(!entity){
  //       const msg = `entity not found, id=${dto.id}`;
  //       this.logger.warn(`update: not executed (${msg})`);
  //       throw new NotFoundException(msg);
  //     }
      
  //     return entity;
  //   })
  //   .then( (entity: Order) => {
      
  //     return this.updateStockMovements(dto)
  //     .then( () => {

  //       return this.updateWithTransactionDb(entity, dto)
  //       .then( (dto: OrderDto) => {
  //         const end = performance.now();
  //         this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
  //         return dto;
  //       })
  //       .catch(error => {
  //         const dto: OrderDto = this.generateOrderWithProductList(entity, entity.orderProduct)
  //         this.updateStockMovements(dto); // * rollback stock movements
  //         throw error;
  //       })
      
  //     })

  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`update: error=${error.message}`);
  //     throw error;
  //   })

  // }

  create(dto: OrderDto): Promise<OrderDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * process with transaction db
    return this.dataSource.transaction( (manager: EntityManager) => {

      // * get repositories
      const saleSequenceRepository: Repository<Sequence> = manager.getRepository(Sequence);
      const orderRepository       : Repository<Order>        = manager.getRepository(Order);
      const orderProductRepository: Repository<OrderProduct> = manager.getRepository(OrderProduct);

      return this.generateCode(dto.companyId, SequenceTypeEnum.ORDER, saleSequenceRepository) // * generate code
      .then( (code: number) => {

        // * set code
        dto.code = code;

        return this.prepareEntity(new Order(), dto) // * prepare
        .then( (entity: Order) => this.save(entity, orderRepository) ) // * save
        .then( (entity: Order) => {
          return this.updateOrderProduct(entity, dto.productList, orderProductRepository) 
          .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) ) // * generate dto
        })

      })

    })
    .then( (dto: OrderDto) => {

      return this.updateStockMovements(dto) // * update stock movements
      .then( () => {
        const end = performance.now();
        this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })
      .catch(error => {
        this.remove(dto.id); // * rollback
        throw error;
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`create: error=${error.message}`);
      throw error;
    })

  }

  // create(dto: OrderDto): Promise<OrderDto> {
  //   this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
  //   const start = performance.now();

  //   return this.createWithTransactionDb(dto)
  //   .then( (dto: OrderDto) => {

  //     return this.updateStockMovements(dto)
  //     .then( () => {
  //       const end = performance.now();
  //       this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
  //       return dto;
  //     })
  //     .catch(error => {
  //       this.remove(dto.id); // * rollback order
  //       throw error;
  //     })

  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException || error instanceof AlreadyExistException)
  //       throw error;

  //     this.logger.error(`create: error=${error.message}`);
  //     throw error;
  //   })

  // }

  remove(id: string): Promise<string> {
    this.logger.log(`remove: starting process... id=${id}`);
    const start = performance.now();

    return this.orderRepository.findOne({
      where: { id },
    })
    .then( (entity: Order) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${id}`;
        this.logger.warn(`remove: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      // * delete: update field active
      entity.active = false;
      return entity;
    })
    .then( (entity: Order) => this.save(entity) )
    .then( () => {
      const end = performance.now();
      this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
      return 'deleted';
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      if(error.errno == 1217) {
        const msg = 'entity is being used';
        this.logger.warn(`remove: not executed (${msg})`, error);
        throw new IsBeingUsedException(msg);
      }

      this.logger.error('remove: error', error);
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

  // private updateWithTransactionDb(entity: Order, dto: OrderDto): Promise<OrderDto> {
  //   const start = performance.now();

  //   return this.dataSource.transaction( (manager: EntityManager) => {

  //     // * get repositores
  //     const orderRepository: Repository<Order> = manager.getRepository(Order);
  //     const orderProductRepository: Repository<OrderProduct> = manager.getRepository(OrderProduct);

  //     return this.prepareEntity(entity, dto) // * prepare
  //     .then( (entity: Order) => this.save(entity, orderRepository) ) // * update
  //     .then( (entity: Order) => {
  //       return this.updateOrderProduct(entity, dto.productList, orderProductRepository) 
  //       .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) )
  //     })

  //   })
  //   .then( (dto: OrderDto) => {
  //     const end = performance.now();
  //     this.logger.log(`updateWithTransactionDb: OK, runtime=${(end - start) / 1000} seconds`);
  //     return dto;
  //   })
  // }

  // private createWithTransactionDb(dto: OrderDto): Promise<OrderDto> {
  //   const start = performance.now();

  //   return this.dataSource.transaction( (manager: EntityManager) => {

  //     // * get repositories
  //     const saleSequenceRepository: Repository<SaleSequence> = manager.getRepository(SaleSequence);
  //     const orderRepository       : Repository<Order>        = manager.getRepository(Order);
  //     const orderProductRepository: Repository<OrderProduct> = manager.getRepository(OrderProduct);

  //     return this.generateCode(dto.companyId, saleSequenceRepository) // * generate code
  //     .then( (code: number) => {

  //       // * set code
  //       dto.code = code;

  //       return this.prepareEntity(new Order(), dto) // * prepare
  //       .then( (entity: Order) => this.save(entity, orderRepository) ) // * save
  //       .then( (entity: Order) => {
  //         return this.updateOrderProduct(entity, dto.productList, orderProductRepository) 
  //         .then( (orderProductList: OrderProduct[]) => this.generateOrderWithProductList(entity, orderProductList) ) // * generate dto
  //       })

  //     })

  //   })
  //   .then( (dto: OrderDto) => {
  //     const end = performance.now();
  //     this.logger.log(`createWithTransactionDb: OK, runtime=${(end - start) / 1000} seconds`);
  //     return dto;
  //   })
  // }

  private async generateCode(companyId: string, type: SequenceTypeEnum, saleSequenceRepository: Repository<Sequence>): Promise<number> {

    let sequenceEntity = await saleSequenceRepository
    .createQueryBuilder('a')
    .setLock('pessimistic_write')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.type = :type', { type })
    .getOne();

    // * increase sequence
    if (!sequenceEntity) 
      sequenceEntity = saleSequenceRepository.create({ companyId, lastCode: 1 });
    else sequenceEntity.lastCode += 1;

    // * save sequence
    await saleSequenceRepository.save(sequenceEntity);

    return sequenceEntity.lastCode;
  }

  private prepareEntity(entity: Order, dto: OrderDto): Promise<Order> {
  
    const company = new Company();
    company.id = dto.companyId;

    const user = new User();
    user.id = dto.userId;

    try {
      entity.id             = dto.id ? dto.id : undefined;
      entity.code           = dto.code ? dto.code : undefined;
      entity.company        = company;
      entity.user           = user;
      entity.customerIdDoc  = dto.customerIdDoc?.toUpperCase();
      entity.customerName   = dto.customerName?.toUpperCase();
      entity.customerEmail  = dto.customerEmail?.toUpperCase();
      entity.customerPhone  = dto.customerPhone;
      entity.customerAddress = dto.customerAddress?.toUpperCase();
      entity.comment        = dto.comment;
      entity.discount       = dto.discount;
      entity.discountPct    = dto.discountPct;
      entity.status         = dto.status;
      
      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: Order, orderRepository?: Repository<Order>): Promise<Order> {
    const start = performance.now();

    if(!orderRepository)
      orderRepository = this.orderRepository;

    const newEntity: Order = orderRepository.create(entity);

    return orderRepository.save(newEntity)
    .then( (entity: Order) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  // private saveGenerateCode(entity: Order): Promise<Order> {
  //   const start = performance.now();

  //   return this.dataSource.transaction( async(manager) => {

  //     const companyId = entity.company.id;
      
  //     // * get sequence
  //     const saleSequenceRepository = manager.getRepository(SaleSequence);
      
  //     let sequenceEntity = await saleSequenceRepository
  //     .createQueryBuilder('a')
  //     .setLock('pessimistic_write')
  //     .where('a.companyId = :companyId', { companyId })
  //     .getOne();

  //     // * increase sequence
  //     if (!sequenceEntity) 
  //       sequenceEntity = saleSequenceRepository.create({ companyId, lastCode: 1 });
  //     else sequenceEntity.lastCode += 1;

  //     // * save sequence
  //     await saleSequenceRepository.save(sequenceEntity);

  //     // * generate order
  //     const orderRepository = manager.getRepository(Order);

  //     const newOrder = orderRepository.create({
  //       ...entity,
  //       code: sequenceEntity.lastCode
  //     });

  //     // * save order
  //     return orderRepository.save(newOrder);

  //   })
  //   .then( (entity: Order) => {
  //     const end = performance.now();
  //     this.logger.log(`saveGenerateCode: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
  //     return entity;
  //   })
  // }

  private updateOrderProduct(order: Order, orderProductDtoList: OrderProductDto[] = [], orderProductRepository: Repository<OrderProduct>): Promise<OrderProduct[]> {
    this.logger.log(`updateOrderProduct: starting process... order=${JSON.stringify(order)}, orderProductDtoList=${JSON.stringify(orderProductDtoList)}`);
    const start = performance.now();

    if(orderProductDtoList.length == 0){
      this.logger.warn('updateOrderProduct: not executed (order product list empty)');
      return Promise.resolve([]);
    }

    // * create order-product
    return orderProductRepository.find({
      where: { order },
    })
    .then( (orderProductList: OrderProduct[]) => orderProductRepository.remove(orderProductList) ) // * remove order products
    .then( () => {

      // // * generate order product list
      // const orderProductListToInsert: OrderProduct[] = orderProductDtoList.map( (value) => {
      //   const orderProduct = new OrderProduct();
      //   orderProduct.orderCode    = order.code;
      //   orderProduct.productId    = value.id;
      //   orderProduct.name         = value.name;
      //   orderProduct.code         = value.code;
      //   orderProduct.qty          = value.qty;
      //   orderProduct.comment      = value.comment;
      //   orderProduct.cost         = value.cost;
      //   orderProduct.price        = value.price;
      //   orderProduct.discount     = value.discount;
      //   orderProduct.discountPct  = value.discountPct;
      //   orderProduct.status       = value.status;
      //   orderProduct.order        = order;
        
      //   return orderProduct;
      // })

      // // * generate new order product list
      // const newOrderProductListToInsert: OrderProduct[] = orderProductListToInsert.map( (value) => orderProductRepository.create(value) );
      
      // * generate list to insert
      const orderProductList: OrderProduct[] = orderProductDtoList.map( (value) => {
        
        const orderProduct = new OrderProduct();
        orderProduct.orderCode    = order.code;
        orderProduct.productId    = value.id;
        orderProduct.name         = value.name;
        orderProduct.code         = value.code;
        orderProduct.qty          = value.qty;
        orderProduct.comment      = value.comment;
        orderProduct.cost         = value.cost;
        orderProduct.price        = value.price;
        orderProduct.discount     = value.discount;
        orderProduct.discountPct  = value.discountPct;
        orderProduct.status       = value.status;
        orderProduct.order        = order;
        
        return orderProductRepository.create(orderProduct);
      })

      // * bulk insert
      return orderProductRepository
      .createQueryBuilder()
      .insert()
      .into(OrderProduct)
      .values(orderProductList)
      .execute()
      .then( (insertResult: InsertResult) => {
        const end = performance.now();
        this.logger.log(`updateOrderProduct: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
        return orderProductList;
      })

    })
    .catch(error => {
      this.logger.error(`updateOrderProduct: error=${error.message}`);
      throw error;
    })

  }

  // private bulkInsertOrderProducts(orderProductList: OrderProduct[], orderProductRepository: Repository<OrderProduct>): Promise<OrderProduct[]> {
  //   const start = performance.now();
  //   this.logger.log(`bulkInsertOrderProducts: starting process... listSize=${orderProductList.length}`);

  //   const newOrderProductList: OrderProduct[] = orderProductList.map( (value) => orderProductRepository.create(value));
    
  //   try {
  //     // return this.orderProductRepository.manager.transaction( async(transactionalEntityManager) => {
        
  //       return orderProductRepository
  //       .createQueryBuilder()
  //       .insert()
  //       .into(OrderProduct)
  //       .values(newOrderProductList)
  //       .execute()
  //       .then( (insertResult: InsertResult) => {
  //         const end = performance.now();
  //         this.logger.log(`bulkInsertOrderProducts: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
  //         return newOrderProductList;
  //       })

  //     // })

  //   } catch (error) {
  //     this.logger.error(`bulkInsertOrderProducts: error=${error.message}`);
  //     throw error;
  //   }
  // }

  private updateStockMovements(dto: OrderDto): Promise<string> {

    if(dto.status == OrderStatusEnum.QUOTATION) {
      const msg = 'order status does not generate stock movement';
      this.logger.log(`updateStockMovements: not executed (${msg})`);
      return Promise.resolve(msg);
    }

    if(dto.status == OrderStatusEnum.ORDER || dto.status == OrderStatusEnum.INVOICED || dto.status == OrderStatusEnum.PAID) {  
      const movementDtoList = dto.productList.map( (value) => new MovementDto(MovementTypeEnum.OUT, MovementReasonEnum.SALE, value.qty, value.id, dto.userId, undefined, dto.id));
      const messageDto = new MessageDto(SourceEnum.API_SALES, ProcessEnum.MOVEMENT_UPDATE, JSON.stringify(movementDtoList));
      return this.replicationService.sendMessage(messageDto);
    }

    if(dto.status == OrderStatusEnum.CANCELLED) {
      const jsonBasic: JsonBasic = { id: dto.id }
      const messageDto = new MessageDto(SourceEnum.API_SALES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
      return this.replicationService.sendMessage(messageDto);
    }

    throw new Error(`unexpected order status, status=${dto.status}`);
    
  }

  // private deleteStockMovements(relatedId: string): Promise<string> {
  //   const jsonBasic: JsonBasic = { id: relatedId }
  //   const messageDto = new MessageDto(SourceEnum.API_SALES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
  //   return this.replicationService.sendMessage(messageDto);
  // }

  // private updateMovements(dto: OrderDto): void {

  //   if(dto.status == OrderStatusEnum.ORDER || dto.status == OrderStatusEnum.INVOICED || dto.status == OrderStatusEnum.PAID) {  
  //     // * replication data
  //     const movementDtoList = dto.productList.map( (value) => new MovementDto(MovementTypeEnum.OUT, MovementReasonEnum.SALE, value.qty, value.id, dto.user?.id, undefined, dto.id));
  //     const messageDto = new MessageDto(SourceEnum.API_SALES, ProcessEnum.MOVEMENT_UPDATE, JSON.stringify(movementDtoList));
  //     this.replicationService.sendMessages([messageDto]);
  //   }

  //   if(dto.status == OrderStatusEnum.CANCELLED) {
  //     const jsonBasic: JsonBasic = { id: dto.id }
  //     const messageDto = new MessageDto(SourceEnum.API_SALES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
  //     this.replicationService.sendMessages([messageDto]);
  //   }
    
  // }

  generateOrderWithProductList(order: Order, orderProductList: OrderProduct[]): OrderDto {
    
    let orderProductDtoList: OrderProductDto[] = [];
    let cost  = 0;
    let price = 0;

    if(orderProductList.length > 0){
      orderProductDtoList = orderProductList.map( (orderProduct: OrderProduct) => new OrderProductDto(orderProduct.productId, orderProduct.qty, orderProduct.name, orderProduct.cost, orderProduct.price, orderProduct.comment, orderProduct.code, orderProduct.discount, orderProduct.discountPct, orderProduct.status) );

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
    let createdAtFormat = moment(order.createdAt).format(DateFormatEnum.DATETIME_FORMAT);
    createdAtFormat     = moment.utc(createdAtFormat).tz(DateFormatEnum.TIME_ZONE).format(DateFormatEnum.DATETIME_FORMAT);

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

  // private findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<Order[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search;
  //   if(value) {
  //     const whereById     = { id: value, active: true };
  //     const whereByValue  = { company: { id: companyId }, comment: Like(`%${value}%`), active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.orderRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where,
  //       relations: {
  //         orderProduct: true
  //       },
  //       order: { createdAt: "DESC" }
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0){
  //     return this.orderRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         company: { 
  //           id: companyId
  //         },
  //         comment: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
  //         // comment: In(inputDto.searchList),
  //         active: true
  //       },
  //       relations: {
  //         orderProduct: true
  //       },
  //       order: { createdAt: "DESC" }
  //     })
  //   }

  //   // * search all
  //   return this.orderRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: { 
  //       company: { 
  //         id: companyId 
  //       },
  //       active: true 
  //     },
  //     relations: {
  //       orderProduct: true
  //     },
  //     order: { createdAt: "DESC" }
  //   })
    
  // }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: OrderSearchInputDto): Promise<Order[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.orderRepository.createQueryBuilder('a')
    .leftJoinAndSelect('a.company', 'company')
    .leftJoinAndSelect('a.orderProduct', 'orderProduct')
    // .leftJoinAndSelect('orderProduct.product', 'product')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.active = :active', { active: true });

    if(inputDto.createdAtInit) {
      const createdAtInit = moment.tz(inputDto.createdAtInit, DateFormatEnum.TIME_ZONE).utc().format(DateFormatEnum.DATETIME_FORMAT)
      query.andWhere('a.createdAt >= :createdAtInit', { createdAtInit: createdAtInit });
    }

    if(inputDto.createdAtEnd) {
      const createdAtEnd = moment.tz(inputDto.createdAtEnd, DateFormatEnum.TIME_ZONE).utc().format(DateFormatEnum.DATETIME_FORMAT)
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

  // private findOneById(id: string, companyId?: string): Promise<OrderDto[]> {
  //   const start = performance.now();
  //   const inputDto: SearchInputDto = new SearchInputDto(id);
        
  //   // * find product
  //   return this.findByValue({}, inputDto, companyId)
  //   .then( (entityList: Order[]) => entityList.map( (entity) => this.generateOrderWithProductList(entity, entity.orderProduct) ) )
  //   .then( (dtoList: OrderDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `order not found, id=${id}`;
  //       this.logger.warn(`findOneById: ${msg}`);
  //       throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`findOneById: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`findOneById: error`, error);
  //     throw error;
  //   })
    
  // }

  // private async generateCode(companyId: string): Promise<string> {

  //   const code = await generateCode();

  //   return this.findByCode(companyId, code)
  //   .then( (orderList: Order[]) => {

  //     if(orderList.length == 0)
  //       return code;

  //     return this.generateCode(companyId);
  //   })

  // }

  // private findByCode(companyId: string, code: string): Promise<Order[]> {
  //   return this.orderRepository.find({
  //     where: {
  //       company: { 
  //         id: companyId 
  //       },
  //       code: code,
  //       active: true 
  //     }
  //   })
  // }

}
