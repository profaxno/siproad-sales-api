import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Controller, Get, Body, Patch, Param, Delete, Logger, HttpCode, HttpStatus, Query, ParseUUIDPipe, NotFoundException, Post } from '@nestjs/common';

import { ProductDto, ResponseDto } from './dto';
import { ProductService } from './product.service';
import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';

@Controller('products')
export class ProductController {

  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  @Post('/updateBatch')
  @HttpCode(HttpStatus.OK)
  updateBatch(@Body() dtoList: ProductDto[]): Promise<ResponseDto> {
    this.logger.log(`>>> updateBatch: listSize=${dtoList.length}`);
    const start = performance.now();

    return this.productService.updateBatch(dtoList)
    .then( (processSummaryDto: ProcessSummaryDto) => {
      const response = new ResponseDto(HttpStatus.OK, "executed", undefined, processSummaryDto);
      const end = performance.now();
      this.logger.log(`<<< updateBatch: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }
  
  @Patch('/update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: ProductDto): Promise<ResponseDto> {
    this.logger.log(`>>> update: dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.productService.update(dto)
    .then( (dto: ProductDto) => {
      const response = new ResponseDto(HttpStatus.OK, 'executed', 1, [dto]);
      const end = performance.now();
      this.logger.log(`<<< update: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      if(error instanceof AlreadyExistException)
        return new ResponseDto(HttpStatus.BAD_REQUEST, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
    
  }

  @Get('/find/:companyId')
  find(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() paginationDto: SearchPaginationDto,
    @Body() inputDto: SearchInputDto
  ): Promise<ResponseDto> {

    this.logger.log(`>>> find: companyId=${companyId}, paginationDto=${JSON.stringify(paginationDto)}, inputDto=${JSON.stringify(inputDto)}`);
    const start = performance.now();
    
    return this.productService.find(companyId, paginationDto, inputDto)
    .then( (dtoList: ProductDto[]) => {
      const response = new ResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< find: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }

  @Get('/findOneById/:companyId/:id')
  findOneById(@Param('id') id: string): Promise<ResponseDto> {
    this.logger.log(`>>> findOneById: id=${id}`);
    const start = performance.now();

    return this.productService.findOneById(id)
    .then( (dtoList: ProductDto[]) => {
      const response = new ResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findOneById: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Get('/findByValue/:companyId/:value')
  findByValue(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('value') value: string
  ): Promise<ResponseDto> {

    this.logger.log(`>>> findByValue: companyId=${companyId}, value=${value}`);
    const start = performance.now();

    return this.productService.findOneById(value, companyId)
    .then( (dtoList: ProductDto[]) => {
      const response = new ResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findByValue: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Get('/findByCategory/:companyId/:categoryId')
  findByCategory(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() paginationDto: SearchPaginationDto
  ): Promise<ResponseDto> {

    this.logger.log(`>>> findByCategory: companyId=${companyId}, categoryId=${categoryId}, paginationDto=${JSON.stringify(paginationDto)}`);
    const start = performance.now();

    return this.productService.findByCategory(companyId, categoryId, paginationDto)
    .then( (dtoList: ProductDto[]) => {
      const response = new ResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findByCategory: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Delete('/:id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseDto> {
    this.logger.log(`>>> remove: id=${id}`);
    const start = performance.now();

    return this.productService.remove(id)
    .then( (msg: string) => {
      const response = new ResponseDto(HttpStatus.OK, msg);
      const end = performance.now();
      this.logger.log(`<<< remove: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new ResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      if(error instanceof IsBeingUsedException)
        return new ResponseDto(HttpStatus.BAD_REQUEST, error.message, 0, []);

      this.logger.error(error.stack);
      return new ResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }
  
}
