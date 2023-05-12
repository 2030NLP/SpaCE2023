# !/usr/bin/env python
# -*- coding:utf-8 -*-
import argparse
import json
import numpy as np
import scipy.optimize as opt
import traceback


def intersection_and_union(input, target):
    _input, _target = set(input), set(target)
    intersection = _input & _target
    union = _input | _target

    return len(intersection), len(union)


def cal_similarity(golden_tuple, predicted_tuple, corefs, params):
    roles_set = set()
    total_score = 0.0

    for x in golden_tuple:
        golden_role = x['role']
        roles_set.add(golden_role)
        score_collection = []
        for y in predicted_tuple:
            roles_set.add(y['role'])
            if y['role'] != golden_role:
                continue
            element_sim_score = []
            if 'label' in x:
                if 'label' not in y:
                    element_sim_score.append(0.0)
                elif (isinstance(x['label'], str) == True) and (isinstance(y['label'], str) == True):
                    if x['label'] != y['label']:
                        element_sim_score.append(0.0)
                    else:
                        element_sim_score.append(1.0)
                else:
                    element_sim_score.append(0.0)
                if (golden_role == '时间') and ('fragment' not in x) and ('fragment' in y):
                    element_sim_score.append(0.0)
            if 'fragment' in x:
                if 'fragment' not in y:
                    element_sim_score.append(0.0)
                elif (isinstance(x['fragment'], dict) == True) and (isinstance(y['fragment'], dict) == True):
                    g_element, p_element = x['fragment'], y['fragment']
                    p_idx, g_idx = p_element['idxes'], g_element['idxes']
                    p_text, g_text = p_element['text'], g_element['text']

                    if (golden_role == '空间实体') or (golden_role == '参照实体'):  # 如果是空间实体，使用idx评价
                        n_inter, n_union = intersection_and_union(p_idx, g_idx)
                        sim_score = n_inter / n_union

                        # 尝试取所有共指中重合度最高的一个
                        g_idx_set = set(g_idx)
                        for key in corefs:
                            key_idx_set = set(eval(key))
                            if (key_idx_set.issubset(g_idx_set)):
                                diff_set = g_idx_set - key_idx_set
                                for c in corefs[key]:
                                    corefed_g_idx = set(c['idxes']) | diff_set
                                    n_inter, n_union = intersection_and_union(p_idx, corefed_g_idx)
                                    sim_score = max(sim_score, n_inter / n_union)

                        if (params['debug']):
                            print('Golden entity: ', g_element)
                            print('Predicted entity: ', p_element)
                            print('Score: ', sim_score)
                            input()

                        if sim_score == 0: # 空间实体不能错误
                            return 0
                        else:
                            element_sim_score.append(sim_score)
                    else:
                        # 计算原文本的相似度
                        n_inter, n_union = intersection_and_union(p_text, g_text)
                        sim_score = n_inter / n_union
                        element_sim_score.append(sim_score)
                else:
                    element_sim_score.append(0.0)
                if (golden_role == '时间') and ('label' not in x) and ('label' in y):
                    element_sim_score.append(0.0)
            score_collection.append(sum(element_sim_score)/len(element_sim_score))
        if len(score_collection) == 0:
            total_score += 0.0
        else:
            total_score += max(score_collection)

    return total_score / len(roles_set)


def KM_algorithm(pair_scores):
    row_ind, col_ind = opt.linear_sum_assignment(-pair_scores)  # 求负将最大和转变为最小和
    max_score = pair_scores[row_ind, col_ind].sum()
    return max_score


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

    precisions, recalls, f1s = [], [], []
    for qid in answers:
        if (qid not in predictions):
            precisions.append(0)
            recalls.append(0)
            f1s.append(0)
        else:
            x, y = answers[qid], predictions[qid]

            if (params['debug']):
                print(x['context'])
                print(x['corefs'])

            # build coreference set
            corefs = {}
            for coref_set in x['corefs']:
                for coref_element in coref_set:
                    idx_str = str(coref_element['idxes'])
                    if (idx_str not in corefs):
                        corefs[idx_str] = coref_set

            golden_outputs = x['results']
            M = len(golden_outputs)
            predicted_outputs = y['results']
            N = len(predicted_outputs)
            if (N > 100):  # malicious submit
                continue

            pair_scores = np.zeros((M, N))
            for i in range(M):
                for j in range(N):
                    pair_scores[i][j] = cal_similarity(
                        golden_outputs[i],
                        predicted_outputs[j],
                        corefs,
                        params,
                    )

            max_bipartite_score = KM_algorithm(pair_scores)
            if (N == 0):
                _precision = 0
            else:
                _precision = max_bipartite_score / N
            if (M == 0):
                _recall = 0
            else:
                _recall = max_bipartite_score / M
            if (_precision + _recall == 0):
                _f1 = 0
            else:
                _f1 = 2 * (_precision * _recall) / (_precision + _recall)
            precisions.append(_precision)
            recalls.append(_recall)
            f1s.append(_f1)

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

    if (params['debug']):
        print(status)
        if (final_result is not None):
            print('Micro F1 score: %f' % (final_result['micro_f1']))
            print('Macro F1 score: %f' % (final_result['macro_f1']))
            print('Average precision: %f' % (final_result['avg_precision']))
            print('Average recall: %f' % (final_result['avg_recall']))

    return status, final_result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--answer_path', type=str, default='./data/input/task2/task2_test.jsonl')
    parser.add_argument('--prediction_path', type=str, default='./data/input/task2/task2_test.jsonl')
    parser.add_argument('--debug', action='store_true')

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