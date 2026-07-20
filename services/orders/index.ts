import "server-only";

/**
 * Order engine — the public surface. Nothing outside this folder imports
 * services/orders/* by its internal path.
 */

export type {
  OrderStatusValue,
  OrderItemStatusValue,
  OrderItemKindValue,
  PriorityValue,
} from "./types";
export { PRIORITY_ORDER } from "./types";
export {
  ORDER_TRANSITIONS,
  ITEM_TRANSITIONS,
  canTransitionOrder,
  canTransitionItem,
  isTerminalOrder,
  isTerminalItem,
  TransitionError,
} from "./status";
export { deriveOrderStatus } from "./derive";
export { formatReference, parseReference, nextReference } from "./reference";
export type {
  OrderRow,
  OrderItemRow,
  BoardItem,
  OrderWithItems,
  CreateOrderInput,
  AddItemInput,
  MoveResult,
} from "./repository";
export {
  listBoardItems,
  listOrders,
  getOrder,
  createOrder,
  addItem,
  moveItem,
  moveOrder,
  assignItem,
  addNote,
} from "./repository";
export type { CustomerOrder } from "./customer";
export {
  canCustomerReview,
  revisionNumberFrom,
  listOrdersForCustomer,
  getOrderForCustomer,
  approveItem,
  requestRevision,
} from "./customer";
