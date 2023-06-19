import { ChartNode, NodeId } from '../../model/NodeBase';
import { EditorDefinition, NodeImpl, nodeDefinition } from '../../model/NodeImpl';
import { NodeInputDefinition, NodeOutputDefinition, PortId } from '../../model/NodeBase';
import { DataValue } from '../../model/DataValue';
import { SupportedModels, chunkStringByTokenCount, modelOptions, openaiModels } from '../../utils/tokenizer';
import { nanoid } from 'nanoid';
import { coerceType } from '../../utils/coerceType';

export type ChunkNodeData = {
  numTokensPerChunk: number;

  model: string;
  useModelInput: boolean;

  overlap: number;
};

export type ChunkNode = ChartNode<'chunk', ChunkNodeData>;

export class ChunkNodeImpl extends NodeImpl<ChunkNode> {
  static create() {
    const chartNode: ChunkNode = {
      type: 'chunk',
      title: 'Chunk',
      id: nanoid() as NodeId,
      visualData: {
        x: 0,
        y: 0,
        width: 200,
      },
      data: {
        model: 'gpt-3.5-turbo',
        useModelInput: false,
        numTokensPerChunk: 1024,
        overlap: 0,
      },
    };

    return chartNode;
  }

  getInputDefinitions(): NodeInputDefinition[] {
    return [
      {
        id: 'input' as PortId,
        title: 'Input',
        dataType: 'string',
      },
    ];
  }

  getOutputDefinitions(): NodeOutputDefinition[] {
    return [
      {
        id: 'chunks' as PortId,
        title: 'Chunks',
        dataType: 'string[]',
      },
      {
        id: 'first' as PortId,
        title: 'First',
        dataType: 'string',
      },
      {
        id: 'last' as PortId,
        title: 'Last',
        dataType: 'string',
      },
      {
        id: 'indexes' as PortId,
        title: 'Indexes',
        dataType: 'number[]',
      },
      {
        id: 'count' as PortId,
        title: 'Count',
        dataType: 'number',
      },
    ];
  }

  getEditors(): EditorDefinition<ChunkNode>[] {
    return [
      {
        type: 'dropdown',
        label: 'Model',
        dataKey: 'model',
        options: modelOptions,
        useInputToggleDataKey: 'useModelInput',
      },
      {
        type: 'number',
        label: 'Number of tokens per chunk',
        dataKey: 'numTokensPerChunk',
        min: 1,
        max: 32768,
        step: 1,
      },
      {
        type: 'number',
        label: 'Overlap (in %)',
        dataKey: 'overlap',
        min: 0,
        max: 100,
        step: 1,
      },
    ];
  }

  async process(inputs: Record<PortId, DataValue>): Promise<Record<PortId, DataValue>> {
    const input = coerceType(inputs['input' as PortId], 'string');

    const overlapPercent = this.chartNode.data.overlap / 100;

    const chunked = chunkStringByTokenCount(
      input,
      this.chartNode.data.numTokensPerChunk,
      openaiModels[this.chartNode.data.model as SupportedModels].tiktokenModel,
      overlapPercent,
    );

    return {
      ['chunks' as PortId]: {
        type: 'string[]',
        value: chunked,
      },
      ['first' as PortId]: {
        type: 'string',
        value: chunked[0]!,
      },
      ['last' as PortId]: {
        type: 'string',
        value: chunked.at(-1)!,
      },
      ['indexes' as PortId]: {
        type: 'number[]',
        value: chunked.map((_, i) => i + 1),
      },
      ['count' as PortId]: {
        type: 'number',
        value: chunked.length,
      },
    };
  }
}

export const chunkNode = nodeDefinition(ChunkNodeImpl, 'Chunk');