import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company, ProductType, OrderProduct } from "./";
import {  } from "./order-product.entity";

@Entity("sal_product")
export class Product {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('varchar', { length: 100, nullable: true })
  description: string;

  @Column('double')
  cost: number;

  @Column('double')
  price: number;

  @Column('varchar', { length: 255, nullable: true })
  imagenUrl: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column('boolean', { default: true })
  active: boolean

  @ManyToOne(
    () => Company,
    (company) => company.product,
    { eager: true }
  )
  company: Company;

  @ManyToOne(
    () => ProductType,
    (productType) => productType.product,
    { eager: true }
  )
  productType: ProductType;

  @OneToMany(
    () => OrderProduct,
    (orderProduct) => orderProduct.product
  )
  orderProduct: OrderProduct[];

}
