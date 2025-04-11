import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order, Product } from "./";

@Entity("sal_order_product")
export class OrderProduct {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column('double')
  qty: number;

  @Column('varchar', { length: 100, nullable: true })
  comment: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('double')
  cost: number;

  @Column('double')
  price: number;

  @Column('double', { default: 0 })
  discount: number;

  @Column('double', { default: 0 })
  discountPct: number;

  @Column('tinyint', { unsigned: true })
  status: number;

  @ManyToOne(
    () => Order,
    (order) => order.orderProduct
  )
  order: Order;

  @ManyToOne(
    () => Product,
    (product) => product.orderProduct,
    { eager: true }
  )
  product: Product;
}
