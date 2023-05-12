# !/usr/bin/env python
# -*- coding:utf-8 -*-
import argparse
import json
import traceback


def intersection(input, target):
    _input, _target = set(input), set(target)
    intersection = _input & _target
    return len(intersection), len(_input), len(_target)


def f1_score(n_inter, n_input, n_target):
    if (n_input == 0) or (n_target == 0) or (n_inter == 0):
        return 0.0, 0.0, 0.0

    precision = n_inter / n_input
    recall = n_inter / n_target
    f1 = 2 * (precision * recall) / (precision + recall)
    return precision, recall, f1


def main(params):
    answers = {}
    with open(params['answer_path'], 'r', encoding='utf-8') as fin:
        for line in fin:
            js = json.loads(line)
            answers[js['qid']] = js

    predictions = {}
    with open(params['prediction_path'], 'r', encoding='utf-8') as fin:
        for line in fin:
            js = json.loads(line)
            if ('qid' in js):
                predictions[js['qid']] = js

    prediction_level = params['prediction_level']
    precisions, recalls, f1s = [], [], []
    for qid in answers:
        if (qid not in predictions):
            precisions.append(0)
            recalls.append(0)
            f1s.append(0)
        else:
            x, y = answers[qid], predictions[qid]

            max_precision, max_recall, max_f1 = 0.0, 0.0, 0.0

            for prediction in y['results']:
                for golden in x['results']:
                    if (prediction_level == 'loose'):  # 按文本重合度打分（不要求类别相同）
                        input_set, target_set = set(), set()
                        for t in prediction:
                            input_set |= set(t['idxes'])
                        for t in golden:
                            target_set |= set(t['idxes'])

                        n_inter, n_input, n_target = intersection(input_set, target_set)
                        precision, recall, f1 = f1_score(n_inter, n_input, n_target)

                    elif (prediction_level == 'strict'):  # 按元素重合度打分（要求类别相同）

                        local_intersection, local_input_len, local_target_len = 0, 0, 0
                        for t1 in prediction:
                            found = False
                            for t2 in golden:
                                if (t1['role'] == t2['role']):
                                    found = True
                                    n_inter, n_input, n_target = intersection(t1['idxes'], t2['idxes'])
                                    local_intersection += n_inter
                                    local_input_len += n_input
                                    local_target_len += n_target

                            if not (found):
                                local_input_len += len(t1['idxes'])

                        for t2 in golden:
                            for t1 in prediction:
                                if (t1['role'] == t2['role']):
                                    break
                            else:
                                local_target_len += len(t2['idxes'])

                        precision, recall, f1 = f1_score(local_intersection, local_input_len, local_target_len)

                    if (f1 > max_f1):
                        max_precision, max_recall, max_f1 = precision, recall, f1

            precisions.append(max_precision)
            recalls.append(max_recall)
            f1s.append(max_f1)

    status = 'Accepted'
    avg_precision = sum(precisions) / len(answers)
    avg_recall = sum(recalls) / len(answers)
    if (avg_precision + avg_recall == 0):
        micro_f1 = 0
    else:
        micro_f1 = 2 * (avg_precision * avg_recall) / (avg_precision + avg_recall)
    macro_f1 = sum(f1s) / len(answers)

    final_result = {
        'micro_f1': micro_f1,
        'macro_f1': macro_f1,
        'avg_precision': avg_precision,
        'avg_recall': avg_recall,
    }

    return status, final_result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--answer_path', type=str, default='./data/input/task1/task1_dev.jsonl')
    parser.add_argument('--prediction_path', type=str, default='./data/input/task1/task1_dev.jsonl')
    parser.add_argument('--prediction_level', type=str, choices=['loose', 'strict'], default='strict')

    args = parser.parse_args()
    params = args.__dict__
    print(params)

    try:
        status, final_result = main(params)
    except:
        traceback.print_exc()
        status, final_result = 'Error in execution', None

    print(status)
    if (final_result is not None):
        print(json.dumps(final_result, indent=2))