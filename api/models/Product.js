export default {
  columns: {
    name: {
      type: 'string',
      unique: true,
    },
    description: {
      type: 'text', // Long text field
    },
    price: {
      type: 'decimal',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
  },
  relations: {
    categories: {
      target: 'Category',
      type: 'many-to-many',
      joinTable: true,
      cascade: true,
    },
    orderItems: {
      target: 'OrderItem',
      type: 'one-to-many',
      inverseSide: 'product',
    },
  },
};
