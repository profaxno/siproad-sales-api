import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("sal_sequence")
export class Sequence {

  @PrimaryColumn('uuid')
  companyId: string;

  @Column({ type: 'tinyint', unsigned: true })
  type: number;

  @Column({ type: 'int', unsigned: true })
  lastCode: number;

}