import { hasSameOpTypeAs, type Double, type Operation } from "./algebra.js";

export function getFlattenedOperands<T extends Operation & Double>(op: T): Operation[] {
    const operands = new Array<Operation>();
    flattenedOperands_(op, operands);

    return operands;
}

function flattenedOperands_<T extends Operation & Double>(op: T, operands: Operation[]) {
    for (const operand of op.input) {
        if (hasSameOpTypeAs(operand, op)) {
            flattenedOperands_(operand, operands);
        } else {
            operands.push(operand);
        }
    }
}
