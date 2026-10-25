export function toPlayers(io: any, event: string, payload: any) {
  io.of('/play').emit(event, payload);
}
export function toMesa(io: any, event: string, payload: any) {
  io.of('/mesa').emit(event, payload);
}
export function toAdmin(io: any, event: string, payload: any) {
  io.of('/admin').emit(event, payload);
}
export function toUser(io: any, socketId: string, event: string, payload: any) {
  io.of('/play').to(socketId).emit(event, payload);
}