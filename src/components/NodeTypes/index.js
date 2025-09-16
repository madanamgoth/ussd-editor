import StartNode from './StartNode';
import MenuNode from './MenuNode';
import DynamicMenuNode from '../DynamicMenuNode';
import InputNode from './InputNode';
import ActionNode from './ActionNode';
import EndNode from './EndNode';

export const nodeTypes = {
  start: StartNode,
  menu: MenuNode,
  'dynamic-menu': DynamicMenuNode,
  input: InputNode,
  action: ActionNode,
  end: EndNode,
};

export {
  StartNode,
  MenuNode,
  DynamicMenuNode,
  InputNode,
  ActionNode,
  EndNode,
};
