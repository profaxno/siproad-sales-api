import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from ".";

@Entity("sal_order_product")
export class OrderProduct {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unsigned: true })
  orderCode: number;

  @Column('varchar', { length: 100 })
  productId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50 })
  code: string;

  @Column('double')
  qty: number;

  @Column('varchar', { length: 100, nullable: true })
  comment: string;

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

  // @ManyToOne(
  //   () => Product,
  //   (product) => product.orderProduct,
  //   { eager: true }
  // )
  // product: Product;

  // constructor(id: number, productId: string, qty: number, comment: string, name: string, code: string, cost: number, price: number, discount: number, discountPct: number, status: number, order: Order) {
  //   this.id = id;
  //   this.productId = productId;
  //   this.qty = qty;
  //   this.comment = comment;
  //   this.name = name;
  //   this.code = code;
  //   this.cost = cost;
  //   this.price = price;
  //   this.discount = discount;
  //   this.discountPct = discountPct;
  //   this.status = status;
  //   this.order = order;
  // }

}
